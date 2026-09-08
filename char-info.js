export function init() {
	const charInput = document.getElementById('ci-char');
	const infoDiv   = document.getElementById('ci-info');
	const codesDl   = document.getElementById('ci-codes');

	/* ── Definición de filas ──────────────────────────────────────────── */
	const ROWS = [
		{
			id:    'decimal',
			label: 'Decimal',
			fmt:   cp => String(cp),
			parse: val => {
				const v = val.trim();
				return /^\d+$/.test(v) ? parseInt(v, 10) : NaN;
			},
		},
		{
			id:    'hex',
			label: 'Hexadecimal',
			fmt:   cp => cp.toString(16).toUpperCase().padStart(4, '0'),
			parse: val => {
				const v = val.trim().replace(/^0[xX]/, '');
				return /^[0-9a-fA-F]+$/.test(v) ? parseInt(v, 16) : NaN;
			},
		},
		{
			id:    'uplus',
			label: 'U+',
			fmt:   cp => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
			parse: val => {
				const m = val.trim().match(/^[Uu]\+([0-9a-fA-F]{1,6})$/);
				return m ? parseInt(m[1], 16) : NaN;
			},
		},
		{
			id:    'js',
			label: 'JS / JSON',
			fmt:   cp => cp > 0xFFFF
				? `\\u{${cp.toString(16).toUpperCase()}}`
				: `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`,
			parse: val => {
				const v  = val.trim();
				const m1 = v.match(/^\\u\{([0-9a-fA-F]{1,6})\}$/);
				if (m1) return parseInt(m1[1], 16);
				const m2 = v.match(/^\\u([0-9a-fA-F]{4})$/);
				if (m2) return parseInt(m2[1], 16);
				return NaN;
			},
		},
		{
			id:    'htmlDec',
			label: 'HTML decimal',
			fmt:   cp => `&#${cp};`,
			parse: val => {
				const m = val.trim().match(/^&#(\d+);?$/);
				return m ? parseInt(m[1], 10) : NaN;
			},
		},
		{
			id:    'htmlHex',
			label: 'HTML hex',
			fmt:   cp => `&#x${cp.toString(16).toUpperCase()};`,
			parse: val => {
				const m = val.trim().match(/^&#[xX]([0-9a-fA-F]+);?$/);
				return m ? parseInt(m[1], 16) : NaN;
			},
		},
		{
			id:    'css',
			label: 'CSS',
			fmt:   cp => `\\${cp.toString(16).toUpperCase()}`,
			parse: val => {
				const m = val.trim().match(/^\\([0-9a-fA-F]{1,6})\s?$/);
				return m ? parseInt(m[1], 16) : NaN;
			},
		},
		{
			id:    'url',
			label: 'URL (%)',
			fmt:   cp => encodeURIComponent(String.fromCodePoint(cp)),
			parse: val => {
				try {
					const decoded = decodeURIComponent(val.trim());
					const cp      = decoded.codePointAt(0);
					return cp !== undefined ? cp : NaN;
				} catch {
					return NaN;
				}
			},
		},
		{
			id:    'utf8',
			label: 'UTF-8 bytes',
			fmt:   cp => {
				const bytes = new TextEncoder().encode(String.fromCodePoint(cp));
				return [...bytes].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
			},
			parse: val => {
				try {
					const parts = val.trim().split(/\s+/);
					if (!parts.length || (parts.length === 1 && !parts[0])) return NaN;
					const bytes = parts.map(h => parseInt(h, 16));
					if (bytes.some(isNaN)) return NaN;
					const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
					const cp      = decoded.codePointAt(0);
					return cp !== undefined ? cp : NaN;
				} catch {
					return NaN;
				}
			},
		},
		{
			id:    'binary',
			label: 'Binario',
			fmt:   cp => {
				const bits = cp.toString(2);
				const pad  = Math.max(8, Math.ceil(bits.length / 8) * 8);
				return bits.padStart(pad, '0');
			},
			parse: val => {
				const b = val.replace(/\s/g, '');
				return /^[01]+$/.test(b) && b.length > 0 ? parseInt(b, 2) : NaN;
			},
		},
	];

	/* ── Construir filas en el DL ─────────────────────────────────────── */
	for (const row of ROWS) {
		const dt  = document.createElement('dt');
		const dd  = document.createElement('dd');
		const inp = document.createElement('input');
		const btn = document.createElement('button');

		dt.textContent   = row.label;
		inp.type         = 'text';
		inp.id           = `ci-${row.id}`;
		inp.className    = 'ci-code';
		inp.autocomplete = 'off';
		inp.spellcheck   = false;

		btn.type        = 'button';
		btn.className   = 'ci-copy';
		btn.textContent = 'Copiar';

		inp.addEventListener('input', () => {
			const cp = row.parse(inp.value);
			if (!isNaN(cp) && cp >= 0 && cp <= 0x10FFFF) update(cp);
		});

		/* Al salir del campo: normalizar si el valor es válido */
		inp.addEventListener('blur', () => {
			const cp = row.parse(inp.value);
			if (!isNaN(cp) && cp >= 0 && cp <= 0x10FFFF) inp.value = row.fmt(cp);
		});

		btn.addEventListener('click', () => {
			if (!inp.value) return;
			navigator.clipboard.writeText(inp.value).then(() => {
				btn.textContent = '¡Copiado!';
				setTimeout(() => { btn.textContent = 'Copiar'; }, 1500);
			});
		});

		dd.append(inp, btn);
		codesDl.append(dt, dd);
	}

	/* ── Eventos del campo de carácter ────────────────────────────────── */
	charInput.addEventListener('input', () => {
		const val = charInput.value;
		if (!val) { clear(); return; }
		const cp   = val.codePointAt(0);
		const char = String.fromCodePoint(cp);
		/* Truncar a un único codepoint si se escribió más de uno */
		if (charInput.value !== char) charInput.value = char;
		update(cp);
	});

	charInput.addEventListener('blur', () => {
		const val = charInput.value;
		if (!val) return;
		charInput.value = String.fromCodePoint(val.codePointAt(0));
	});

	/* ── Actualizar todos los campos ──────────────────────────────────── */
	function update(cp) {
		const active = document.activeElement;

		if (active !== charInput) charInput.value = String.fromCodePoint(cp);

		for (const row of ROWS) {
			const inp = document.getElementById(`ci-${row.id}`);
			if (active !== inp) inp.value = row.fmt(cp);
		}

		renderInfo(cp);
	}

	/* ── Badges informativos ──────────────────────────────────────────── */
	function renderInfo(cp) {
		const badges = [];

		if (cp < 128) {
			badges.push({ text: 'ASCII', cls: 'ci-badge-ok' });
			if (cp < 32 || cp === 127) {
				const names = [
					'NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL',
					'BS','TAB','LF','VT','FF','CR','SO','SI',
					'DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB',
					'CAN','EM','SUB','ESC','FS','GS','RS','US',
				];
				const name = cp === 127 ? 'DEL' : (names[cp] ?? '');
				badges.push({ text: `Control${name ? ' (' + name + ')' : ''}`, cls: 'ci-badge-warn' });
			} else {
				badges.push({ text: 'Imprimible', cls: 'ci-badge-ok' });
			}
		} else if (cp < 256) {
			badges.push({ text: 'Latin-1', cls: 'ci-badge-info' });
			if (cp < 160) badges.push({ text: 'Control C1', cls: 'ci-badge-warn' });
		} else if (cp < 0x10000) {
			badges.push({ text: 'BMP — Plano 0', cls: 'ci-badge-info' });
			if (cp >= 0xD800 && cp <= 0xDFFF) {
				badges.push({ text: 'Surrogate (no válido solo)', cls: 'ci-badge-warn' });
			}
		} else {
			const plane      = Math.floor(cp / 0x10000);
			const planeNames = ['', 'SMP', 'SIP', 'TIP', '', '', '', '', '', '', '', '', '', '', 'SSCSP', 'SPUA-A', 'SPUA-B'];
			const pname      = planeNames[plane] ?? '';
			badges.push({ text: `Plano ${plane}${pname ? ' (' + pname + ')' : ''}`, cls: 'ci-badge-info' });

			/* Surrogate pair equivalente (ES5) */
			const offset = cp - 0x10000;
			const high   = (0xD800 + (offset >> 10)).toString(16).toUpperCase().padStart(4, '0');
			const low    = (0xDC00 + (offset & 0x3FF)).toString(16).toUpperCase().padStart(4, '0');
			badges.push({ text: `ES5: \\u${high}\\u${low}`, cls: 'ci-badge-neutral' });
		}

		infoDiv.innerHTML = badges
			.map(b => `<span class="ci-badge ${b.cls}">${b.text}</span>`)
			.join('');
	}

	/* ── Limpiar ──────────────────────────────────────────────────────── */
	function clear() {
		for (const row of ROWS) {
			document.getElementById(`ci-${row.id}`).value = '';
		}
		infoDiv.innerHTML = '';
	}
}
