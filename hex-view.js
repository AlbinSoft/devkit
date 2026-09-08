export function init() {
	const dropEl    = document.getElementById('hv-drop');
	const fileInput = document.getElementById('hv-file');
	const dropLabel = document.getElementById('hv-drop-label');
	const msgEl     = document.getElementById('hv-msg');
	const viewerEl  = document.getElementById('hv-viewer');
	const headEl    = document.getElementById('hv-head');
	const scrollEl  = document.getElementById('hv-scroll');
	const spaceEl   = document.getElementById('hv-space');
	const canvas    = document.getElementById('hv-canvas');
	const statusEl  = document.getElementById('hv-status');
	const closeBtn  = document.getElementById('hv-close');

	const COLS  = 16;
	const ROW_H = 22;  /* debe coincidir con .hv-row height en hex-view.css */
	const BUF   = 50;  /* filas extra renderizadas encima y debajo del viewport */
	const MAX   = 200 * 1024 * 1024;

	let bytes       = null;
	let numRows     = 0;
	let fileName    = '';
	let hoveredIdx  = -1;
	let selectedIdx = -1;
	let rafPending  = false;
	let rendFirst   = -1;
	let rendLast    = -1;

	/* ── Drop zone ─────────────────────────────────────────── */
	dropEl.addEventListener('dragover', e => {
		e.preventDefault();
		dropEl.classList.add('drag-over');
	});
	dropEl.addEventListener('dragleave', () => dropEl.classList.remove('drag-over'));
	dropEl.addEventListener('drop', e => {
		e.preventDefault();
		dropEl.classList.remove('drag-over');
		const f = e.dataTransfer.files[0];
		if (f) loadFile(f);
	});
	fileInput.addEventListener('change', () => {
		if (fileInput.files[0]) loadFile(fileInput.files[0]);
		fileInput.value = '';
	});

	/* ── Close ─────────────────────────────────────────────── */
	closeBtn.addEventListener('click', () => {
		viewerEl.hidden       = true;
		msgEl.hidden          = true;
		dropLabel.textContent = 'Drop a binary file here or click to open';
		bytes = null;
	});

	/* ── Cargar fichero ─────────────────────────────────────── */
	async function loadFile(file) {
		msgEl.hidden = true;

		if (file.size > MAX) {
			msgEl.textContent = `File too large -- max ${MAX / 1048576} MB (this file is ${(file.size / 1048576).toFixed(1)} MB).`;
			msgEl.hidden      = false;
			return;
		}

		fileName              = file.name;
		dropLabel.textContent = `${file.name}  (${fmtSize(file.size)})`;

		const buf = await file.arrayBuffer();
		bytes     = new Uint8Array(buf);
		numRows   = Math.ceil(bytes.length / COLS) || 1;

		/* Resetear estado de interaccion */
		hoveredIdx  = -1;
		selectedIdx = -1;
		rendFirst   = -1;
		rendLast    = -1;

		/* Construir cabecera */
		headEl.innerHTML = '';
		headEl.appendChild(buildHeaderRow());

		/* Altura del espaciador */
		spaceEl.style.height = (numRows * ROW_H) + 'px';

		/* Mostrar visor, ir al inicio, renderizar */
		viewerEl.hidden    = false;
		scrollEl.scrollTop = 0;
		renderRows(true);
		updateStatus();
	}

	/* ── Scroll virtual ─────────────────────────────────────── */
	scrollEl.addEventListener('scroll', () => {
		if (rafPending) return;
		rafPending = true;
		requestAnimationFrame(() => {
			rafPending = false;
			renderRows(false);
		});
	});

	function renderRows(force) {
		const top   = scrollEl.scrollTop;
		const vh    = scrollEl.clientHeight;
		const first = Math.max(0, Math.floor(top / ROW_H) - BUF);
		const last  = Math.min(numRows - 1, Math.ceil((top + vh) / ROW_H) + BUF);

		if (!force && first === rendFirst && last === rendLast) return;
		rendFirst = first;
		rendLast  = last;

		canvas.style.top = (first * ROW_H) + 'px';
		canvas.innerHTML = '';
		for (let r = first; r <= last; r++) canvas.appendChild(buildRow(r));
	}

	/* ── Construccion de filas ──────────────────────────────── */
	function buildHeaderRow() {
		const row = mkEl('div', 'hv-row hv-row-head');

		const off = mkEl('span', 'hv-off');
		off.textContent = 'Offset';
		row.appendChild(off);

		const hex = mkEl('div', 'hv-hex');
		for (let i = 0; i < 16; i++) {
			if (i === 8) hex.appendChild(mkEl('span', 'hv-sep'));
			const s = mkEl('span', 'hv-byte');
			s.textContent = i.toString(16).toUpperCase().padStart(2, '0');
			hex.appendChild(s);
		}
		row.appendChild(hex);

		const asc = mkEl('div', 'hv-asc');
		asc.textContent = '0123456789ABCDEF';
		row.appendChild(asc);

		return row;
	}

	function buildRow(rowIdx) {
		const row   = mkEl('div', 'hv-row');
		const start = rowIdx * COLS;
		const count = Math.min(COLS, bytes.length - start);

		/* Offset */
		const off = mkEl('span', 'hv-off');
		off.textContent = start.toString(16).padStart(8, '0').toUpperCase();
		row.appendChild(off);

		/* Bytes hexadecimales */
		const hex = mkEl('div', 'hv-hex');
		for (let i = 0; i < 16; i++) {
			if (i === 8) hex.appendChild(mkEl('span', 'hv-sep'));
			if (i < count) {
				const idx = start + i;
				const s   = mkEl('span', 'hv-byte' + hlClass(idx));
				s.dataset.idx = idx;
				s.textContent = bytes[idx].toString(16).padStart(2, '0').toUpperCase();
				hex.appendChild(s);
			} else {
				const s = mkEl('span', 'hv-byte hv-pad');
				s.textContent = '  ';
				hex.appendChild(s);
			}
		}
		row.appendChild(hex);

		/* Columna ASCII */
		const asc = mkEl('div', 'hv-asc');
		for (let i = 0; i < count; i++) {
			const idx = start + i;
			const b   = bytes[idx];
			const s   = mkEl('span', 'hv-char' + hlClass(idx));
			s.dataset.idx = idx;
			s.textContent = (b >= 0x20 && b < 0x7F) ? String.fromCharCode(b) : '.';
			asc.appendChild(s);
		}
		row.appendChild(asc);

		return row;
	}

	/* Clase de resaltado segun el estado actual del byte */
	function hlClass(idx) {
		if (idx === selectedIdx) return ' hv-sel';
		if (idx === hoveredIdx)  return ' hv-hov';
		return '';
	}

	/* ── Interaccion ─────────────────────────────────────────── */
	canvas.addEventListener('mouseover', e => {
		const t = e.target.closest('[data-idx]');
		if (!t) return;
		const idx = +t.dataset.idx;
		if (idx === hoveredIdx) return;
		mark(hoveredIdx, 'hv-hov', false);
		hoveredIdx = idx;
		mark(idx, 'hv-hov', true);
		updateStatus();
	});

	canvas.addEventListener('mouseleave', () => {
		mark(hoveredIdx, 'hv-hov', false);
		hoveredIdx = -1;
		updateStatus();
	});

	canvas.addEventListener('click', e => {
		const t = e.target.closest('[data-idx]');
		if (!t) return;
		const idx = +t.dataset.idx;
		mark(selectedIdx, 'hv-sel', false);
		selectedIdx = (idx === selectedIdx) ? -1 : idx;
		mark(selectedIdx, 'hv-sel', true);
		updateStatus();
	});

	/* Aplica o quita una clase a todos los elementos con ese data-idx */
	function mark(idx, cls, add) {
		if (idx < 0) return;
		canvas.querySelectorAll(`[data-idx="${idx}"]`).forEach(n => n.classList.toggle(cls, add));
	}

	/* ── Barra de estado ─────────────────────────────────────── */
	function updateStatus() {
		const active = selectedIdx >= 0 ? selectedIdx : hoveredIdx;
		if (active < 0 || !bytes) {
			statusEl.textContent = bytes ? `${fileName}  --  ${fmtSize(bytes.length)}` : '';
			return;
		}
		const b  = bytes[active];
		const ch = (b >= 0x20 && b < 0x7F) ? `  '${String.fromCharCode(b)}'` : '';
		statusEl.textContent =
			`Byte ${active.toLocaleString()} of ${bytes.length.toLocaleString()}` +
			`  --  offset 0x${active.toString(16).toUpperCase().padStart(8, '0')}` +
			`  --  0x${b.toString(16).toUpperCase().padStart(2, '0')} (${b})${ch}` +
			`  --  ${fileName}`;
	}

	/* ── Helpers ─────────────────────────────────────────────── */
	function mkEl(tag, className) {
		const e = document.createElement(tag);
		if (className) e.className = className;
		return e;
	}

	function fmtSize(n) {
		if (n < 1024)        return n + ' B';
		if (n < 1048576)     return (n / 1024).toFixed(1) + ' KB';
		if (n < 1073741824)  return (n / 1048576).toFixed(1) + ' MB';
		return (n / 1073741824).toFixed(2) + ' GB';
	}
}
