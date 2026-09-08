const FORMATS = {
	'image/jpeg': { ext: 'jpg',  label: 'JPEG', quality: 0.92 },
	'image/png':  { ext: 'png',  label: 'PNG',  quality: 1    },
	'image/webp': { ext: 'webp', label: 'WebP', quality: 0.9  },
};

export function init() {
	const dropzone    = document.getElementById('ir-dropzone');
	const dropLabel   = document.getElementById('ir-drop-label');
	const fileInput   = document.getElementById('ir-input');
	const status      = document.getElementById('ir-status');
	const controls    = document.getElementById('ir-controls');
	const modeRadios  = document.querySelectorAll('input[name="ir-mode"]');
	const widthWrap   = document.getElementById('ir-width-wrap');
	const heightWrap  = document.getElementById('ir-height-wrap');
	const fitWrap     = document.getElementById('ir-fit-wrap');
	const widthInput  = document.getElementById('ir-width');
	const heightInput = document.getElementById('ir-height');
	const fitSelect   = document.getElementById('ir-fit');
	const fmtSelect   = document.getElementById('ir-format');
	const runBtn      = document.getElementById('ir-run');
	const resultsEl   = document.getElementById('ir-results');
	const listEl      = document.getElementById('ir-list');
	const dlAllBtn    = document.getElementById('ir-download-all');
	const zipBtn      = document.getElementById('ir-download-zip');

	let pendingFiles = [];
	let resultEntries = [];

	// --- Drop zone ---

	dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		dropzone.classList.remove('drag-over');
		handleFiles(Array.from(e.dataTransfer.files));
	});

	fileInput.addEventListener('change', () => {
		handleFiles(Array.from(fileInput.files));
		fileInput.value = '';
	});

	function handleFiles(files) {
		const valid = files.filter(f => FORMATS[f.type]);
		if (!valid.length) {
			setStatus('No supported images (JPEG, PNG, WebP).');
			return;
		}
		pendingFiles = valid;
		dropLabel.textContent = valid.length === 1
			? valid[0].name
			: valid.length + ' images selected';
		dropzone.classList.add('has-file');
		setStatus('');
		controls.hidden  = false;
		resultsEl.hidden = true;
		clearResults();
	}

	function clearResults() {
		for (const e of resultEntries) {
			if (e.url) URL.revokeObjectURL(e.url);
		}
		resultEntries    = [];
		listEl.innerHTML = '';
	}

	// --- Mode UI ---

	modeRadios.forEach(r => r.addEventListener('change', updateModeUI));
	updateModeUI();

	function updateModeUI() {
		const mode       = getMode();
		widthWrap.hidden  = mode === 'max-height';
		heightWrap.hidden = mode === 'max-width';
		fitWrap.hidden    = mode !== 'fixed';
	}

	function getMode() {
		return [...modeRadios].find(r => r.checked)?.value ?? 'max-width';
	}

	// --- Resize ---

	runBtn.addEventListener('click', async () => {
		if (!pendingFiles.length) return;

		runBtn.disabled  = true;
		resultsEl.hidden = true;
		clearResults();

		const mode    = getMode();
		const targetW = Math.max(1, parseInt(widthInput.value)  || 800);
		const targetH = Math.max(1, parseInt(heightInput.value) || 600);
		const fit     = fitSelect.value;

		for (let i = 0; i < pendingFiles.length; i++) {
			const file = pendingFiles[i];
			setStatus('Resizing ' + (i + 1) + ' / ' + pendingFiles.length + '...');
			try {
				const fmtOut = fmtSelect.value;
				const mime   = fmtOut === 'original' ? file.type : fmtOut;
				const fmt    = FORMATS[mime];
				const { blob, width, height } = await resizeImage(file, mode, targetW, targetH, fit, mime, fmt.quality);
				const stem   = file.name.replace(/\.[^.]+$/, '');
				const name   = stem + '_resized.' + fmt.ext;
				const entry  = { blob, name, mime, url: null };
				resultEntries.push(entry);
				appendResult(listEl, entry, file, width, height, fmt);
			} catch (e) {
				appendError(listEl, file.name, e.message);
			}
		}

		setStatus('');
		resultsEl.hidden = false;
		runBtn.disabled  = false;
	});

	// --- Bulk downloads ---

	dlAllBtn.addEventListener('click', () => {
		for (const entry of resultEntries) {
			if (!entry.url) continue;
			const a    = document.createElement('a');
			a.href      = entry.url;
			a.download  = entry.name;
			a.click();
		}
	});

	zipBtn.addEventListener('click', async () => {
		zipBtn.disabled = true;
		try {
			const { default: JSZip } = await import('https://esm.sh/jszip');
			const zip = new JSZip();
			for (const entry of resultEntries) {
				zip.file(entry.name, entry.blob);
			}
			const content = await zip.generateAsync({ type: 'blob' });
			const url = URL.createObjectURL(content);
			const a   = document.createElement('a');
			a.href     = url;
			a.download = 'resized-images.zip';
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			zipBtn.disabled = false;
		}
	});

	function setStatus(msg) { status.textContent = msg; }
}

// --- Core resize logic ---

async function resizeImage(file, mode, targetW, targetH, fit, mime, quality) {
	const bitmap = await createImageBitmap(file);
	const srcW   = bitmap.width;
	const srcH   = bitmap.height;

	let canvasW, canvasH, drawX, drawY, drawW, drawH;

	if (mode === 'max-width') {
		if (srcW <= targetW) {
			canvasW = srcW;
			canvasH = srcH;
		} else {
			const scale = targetW / srcW;
			canvasW = targetW;
			canvasH = Math.round(srcH * scale);
		}
		drawX = 0; drawY = 0; drawW = canvasW; drawH = canvasH;

	} else if (mode === 'max-height') {
		if (srcH <= targetH) {
			canvasW = srcW;
			canvasH = srcH;
		} else {
			const scale = targetH / srcH;
			canvasH = targetH;
			canvasW = Math.round(srcW * scale);
		}
		drawX = 0; drawY = 0; drawW = canvasW; drawH = canvasH;

	} else {
		// fixed
		canvasW = targetW;
		canvasH = targetH;

		if (fit === 'fill') {
			drawX = 0; drawY = 0; drawW = canvasW; drawH = canvasH;

		} else if (fit === 'cover') {
			const scale   = Math.max(targetW / srcW, targetH / srcH);
			const scaledW = srcW * scale;
			const scaledH = srcH * scale;
			drawX = (targetW - scaledW) / 2;
			drawY = (targetH - scaledH) / 2;
			drawW = scaledW;
			drawH = scaledH;

		} else {
			// contain
			const scale   = Math.min(targetW / srcW, targetH / srcH);
			const scaledW = srcW * scale;
			const scaledH = srcH * scale;
			drawX = (targetW - scaledW) / 2;
			drawY = (targetH - scaledH) / 2;
			drawW = scaledW;
			drawH = scaledH;
		}
	}

	const canvas = new OffscreenCanvas(canvasW, canvasH);
	const ctx    = canvas.getContext('2d');

	// JPEG has no alpha channel: fill with white first
	if (mime === 'image/jpeg') {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvasW, canvasH);
	}

	ctx.drawImage(bitmap, drawX, drawY, drawW, drawH);
	bitmap.close();

	const blob = await canvas.convertToBlob({ type: mime, quality });
	return { blob, width: canvasW, height: canvasH };
}

// --- Result item rendering ---

function appendResult(container, entry, originalFile, width, height, fmt) {
	const url   = URL.createObjectURL(entry.blob);
	entry.url   = url;

	const item  = document.createElement('div');
	item.className = 'ir-item';

	const thumb = document.createElement('img');
	thumb.src       = url;
	thumb.className = 'ir-thumb';
	thumb.alt       = entry.name;

	const info  = document.createElement('div');
	info.className = 'ir-item-info';

	const nameEl = document.createElement('span');
	nameEl.className   = 'ir-item-name';
	nameEl.textContent = entry.name;

	const metaEl = document.createElement('span');
	metaEl.className   = 'ir-item-meta';
	metaEl.textContent = width + ' x ' + height + ' px  |  '
		+ (entry.blob.size / 1024).toFixed(1) + ' KB'
		+ '  (was ' + (originalFile.size / 1024).toFixed(1) + ' KB)';

	const actions = document.createElement('div');
	actions.className = 'ir-item-actions';

	const dlBtn = document.createElement('a');
	dlBtn.href        = url;
	dlBtn.download    = entry.name;
	dlBtn.textContent = 'Download';
	dlBtn.className   = 'btn';
	actions.appendChild(dlBtn);

	if ('showSaveFilePicker' in window) {
		const saveBtn = document.createElement('button');
		saveBtn.type        = 'button';
		saveBtn.textContent = 'Save';
		saveBtn.addEventListener('click', () => saveFile(entry.blob, entry.name, entry.mime, fmt.ext));
		actions.appendChild(saveBtn);
	}

	info.append(nameEl, metaEl, actions);
	item.append(thumb, info);
	container.appendChild(item);
}

function appendError(container, filename, message) {
	const item = document.createElement('div');
	item.className   = 'ir-item ir-error';
	item.textContent = 'Error: ' + filename + ' -- ' + message;
	container.appendChild(item);
}

async function saveFile(blob, suggestedName, mime, ext) {
	try {
		const handle   = await showSaveFilePicker({
			suggestedName,
			types: [{ description: FORMATS[mime].label, accept: { [mime]: ['.' + ext] } }],
		});
		const writable = await handle.createWritable();
		await writable.write(blob);
		await writable.close();
	} catch (e) {
		if (e.name !== 'AbortError') alert('Error saving: ' + e.message);
	}
}
