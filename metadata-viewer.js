import { parse, thumbnail } from './exifr.js';

// Se piden todos los segmentos por separado (mergeOutput:false) para
// poder mostrarlos agrupados en la interfaz.
const EXIFR_OPTIONS = {
	mergeOutput:     false,
	translateKeys:   true,
	translateValues: true,
	reviveValues:    true,
	silentErrors:    true,
	ifd0:     true,
	exif:     true,
	gps:      true,
	interop:  true,
	ifd1:     true,
	jfif:     true,
	ihdr:     true,
	iptc:     true,
	xmp:      true,
	icc:      true,
};

const BLOCK_TITLES = {
	ifd0:    'Image (IFD0)',
	exif:    'EXIF',
	gps:     'GPS',
	interop: 'Interoperability',
	ifd1:    'Thumbnail (IFD1)',
	jfif:    'JFIF',
	ihdr:    'PNG header (IHDR)',
	iptc:    'IPTC',
	xmp:     'XMP',
	icc:     'ICC profile',
};

// exifr vuelca los chunks tEXt de PNG dentro del bloque ihdr; para esa
// seccion solo mostramos los campos propios de la cabecera IHDR.
const IHDR_KEYS = ['ImageWidth', 'ImageHeight', 'BitDepth', 'ColorType', 'Compression', 'Filter', 'Interlace'];

const PNG_SIG      = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const LATIN1       = new TextDecoder('latin1');
const UTF8         = new TextDecoder('utf-8');
const SRGB_INTENT  = ['Perceptual', 'Relative colorimetric', 'Saturation', 'Absolute colorimetric'];
const RENDERABLE   = ['image/jpeg', 'image/png', 'image/webp'];

export function init() {
	const dropEl     = document.getElementById('mdv-drop');
	const fileInput  = document.getElementById('mdv-file');
	const dropLabel  = document.getElementById('mdv-drop-label');
	const msgEl      = document.getElementById('mdv-msg');
	const resultEl   = document.getElementById('mdv-result');
	const previewEl  = document.getElementById('mdv-preview');
	const gpsWarnEl  = document.getElementById('mdv-gps-warning');
	const sectionsEl = document.getElementById('mdv-sections');
	const copyBtn    = document.getElementById('mdv-copy');
	const closeBtn   = document.getElementById('mdv-close');

	let lastJson = null;

	dropEl.addEventListener('dragover', e => { e.preventDefault(); dropEl.classList.add('drag-over'); });
	dropEl.addEventListener('dragleave', () => dropEl.classList.remove('drag-over'));
	dropEl.addEventListener('drop', e => {
		e.preventDefault();
		dropEl.classList.remove('drag-over');
		const file = e.dataTransfer.files[0];
		if (file) load(file);
	});

	fileInput.addEventListener('change', () => {
		if (fileInput.files[0]) load(fileInput.files[0]);
		fileInput.value = '';
	});

	closeBtn.addEventListener('click', reset);

	copyBtn.addEventListener('click', () => {
		if (!lastJson) return;
		navigator.clipboard.writeText(lastJson).then(() => {
			copyBtn.textContent = 'Copied!';
			setTimeout(() => { copyBtn.textContent = 'Copy as JSON'; }, 1500);
		});
	});

	function reset() {
		resultEl.hidden = true;
		msgEl.hidden    = true;
		dropLabel.textContent = 'Drop an image here or click to open';
		clearPreview();
		sectionsEl.innerHTML = '';
		lastJson = null;
	}

	function clearPreview() {
		if (previewEl.src) URL.revokeObjectURL(previewEl.src);
		previewEl.removeAttribute('src');
		previewEl.hidden = true;
	}

	async function load(file) {
		msgEl.hidden         = true;
		sectionsEl.innerHTML = '';
		gpsWarnEl.hidden     = true;
		clearPreview();

		dropLabel.textContent = `${file.name}  (${fmtSize(file.size)})`;

		const buf   = await file.arrayBuffer();
		const bytes = new Uint8Array(buf);

		// exifr: EXIF / XMP / IPTC / ICC / GPS / IHDR
		let blocks = {};
		try {
			blocks = (await parse(buf, EXIFR_OPTIONS)) || {};
		} catch (err) {
			// Seguimos: al menos mostramos la informacion basica del fichero.
			blocks = {};
		}

		// Dimensiones reales del pixel (JPEG/PNG/WebP). TIFF no decodifica en navegador.
		const dims = await imageDimensions(file).catch(() => null);

		// --- Seccion File ---
		const fileRows = [
			['Name',          file.name],
			['Type',          file.type || sniffType(bytes) || 'unknown'],
			['Size',          `${fmtSize(file.size)}  (${file.size.toLocaleString()} bytes)`],
			['Last modified', file.lastModified ? isoDate(new Date(file.lastModified)) + ' UTC' : null],
		];

		const width  = dims?.width  ?? blocks.ihdr?.ImageWidth  ?? blocks.exif?.ExifImageWidth  ?? blocks.ifd0?.ImageWidth;
		const height = dims?.height ?? blocks.ihdr?.ImageHeight ?? blocks.exif?.ExifImageHeight ?? blocks.ifd0?.ImageHeight;
		if (width && height) {
			fileRows.push(['Dimensions', `${width} x ${height} px`]);
			fileRows.push(['Megapixels', (width * height / 1e6).toFixed(2)]);
		}
		appendSection(sectionsEl, 'File', fileRows);

		// --- PNG: chunks que exifr no interpreta (zTXt, iTXt, pHYs, tIME, ...) ---
		if (isPng(bytes)) {
			const extra = await readPngExtras(buf);
			if (extra) {
				if (extra.other.length) appendSection(sectionsEl, 'PNG chunks', extra.other);
				if (extra.text.length) {
					appendSection(sectionsEl, 'PNG text', extra.text.map(t => [
						t.keyword,
						t.note ? `${t.value ?? ''}  (${t.note})` : t.value,
					]));
				}
			}
		}

		// --- Bloques de exifr ---
		let gpsCoords = null;
		for (const [key, value] of Object.entries(blocks)) {
			if (!value || typeof value !== 'object') continue;
			const source = (key === 'ihdr') ? pick(value, IHDR_KEYS) : value;
			const rows   = blockRows(source);
			if (rows.length) appendSection(sectionsEl, BLOCK_TITLES[key] ?? key, rows);
			if (key === 'gps' && value.latitude != null && value.longitude != null) {
				gpsCoords = { lat: value.latitude, lon: value.longitude };
			}
		}

		if (gpsCoords) renderGpsWarning(gpsWarnEl, gpsCoords);

		// --- Vista previa ---
		showPreview(file, buf);

		// --- JSON para el boton de copia ---
		lastJson = JSON.stringify({ file: Object.fromEntries(fileRows.filter(r => r[1] != null)), ...blocks }, jsonReplacer, 2);

		resultEl.hidden = false;
	}

	function showPreview(file, buf) {
		if (RENDERABLE.includes(file.type)) {
			previewEl.src    = URL.createObjectURL(file);
			previewEl.hidden = false;
			previewEl.onerror = () => { clearPreview(); embeddedThumb(buf); };
		} else {
			embeddedThumb(buf);
		}
	}

	async function embeddedThumb(buf) {
		try {
			const thumb = await thumbnail(buf);
			if (thumb && thumb.byteLength) {
				previewEl.src    = URL.createObjectURL(new Blob([thumb], { type: 'image/jpeg' }));
				previewEl.hidden = false;
			}
		} catch {
			// sin miniatura embebida
		}
	}
}

/* ── Helpers de formato ─────────────────────────────────── */

function renderGpsWarning(el, { lat, lon }) {
	el.hidden    = false;
	el.innerHTML = '';

	const strong = document.createElement('strong');
	strong.textContent = 'This file contains GPS location data.';

	const link = document.createElement('a');
	link.href        = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
	link.target      = '_blank';
	link.rel         = 'noopener noreferrer';
	link.textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)} - open map`;

	el.append(strong, document.createElement('br'), link);
}

function appendSection(container, title, rows) {
	const dl = document.createElement('dl');
	for (const [label, value] of rows) {
		if (value == null || value === '') continue;
		const dt = document.createElement('dt');
		const dd = document.createElement('dd');
		dt.textContent = label;
		dd.textContent = typeof value === 'string' ? value : String(value);
		dl.append(dt, dd);
	}
	if (!dl.children.length) return;

	const section = document.createElement('section');
	const h2      = document.createElement('h2');
	h2.textContent = title;
	section.append(h2, dl);
	container.appendChild(section);
}

function blockRows(obj) {
	const rows = [];
	for (const [name, raw] of Object.entries(obj)) {
		const value = formatValue(raw);
		if (value == null || value === '') continue;
		rows.push([name, value]);
	}
	return rows;
}

function formatValue(raw) {
	if (raw == null) return null;
	if (raw instanceof Date) return isNaN(raw) ? null : isoDate(raw);
	if (raw instanceof Uint8Array) {
		const arr = Array.from(raw);
		return arr.length <= 8 ? arr.map(b => b.toString(16).padStart(2, '0')).join(' ') : `[${arr.length} bytes]`;
	}
	if (Array.isArray(raw)) return raw.map(formatValue).filter(v => v != null && v !== '').join(', ');
	if (typeof raw === 'object') {
		const text = JSON.stringify(raw, jsonReplacer);
		return text.length > 200 ? text.slice(0, 200) + '...' : text;
	}
	if (typeof raw === 'bigint') return raw.toString();
	if (typeof raw === 'number')  return Number.isInteger(raw) ? String(raw) : String(Math.round(raw * 1e6) / 1e6);
	return String(raw).trim();
}

function jsonReplacer(key, value) {
	if (typeof value === 'bigint')      return value.toString();
	if (value instanceof Uint8Array)    return Array.from(value);
	return value;
}

function isoDate(date) {
	return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

function pick(obj, keys) {
	const out = {};
	for (const key of keys) if (obj[key] !== undefined) out[key] = obj[key];
	return out;
}

function fmtSize(bytes) {
	if (bytes < 1024)       return bytes + ' B';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
	return (bytes / 1048576).toFixed(2) + ' MB';
}

function sniffType(bytes) {
	if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
	if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
	if (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a) return 'image/tiff';
	if (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[3] === 0x2a) return 'image/tiff';
	if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
	return null;
}

function isPng(bytes) {
	for (let idx = 0; idx < 8; idx++) if (bytes[idx] !== PNG_SIG[idx]) return false;
	return true;
}

function imageDimensions(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload  = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
		img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('cannot decode')); };
		img.src = url;
	});
}

/* ── Lector de chunks PNG (lo que exifr no cubre) ───────── */

async function readPngExtras(buf) {
	const bytes = new Uint8Array(buf);
	if (!isPng(bytes)) return null;

	const view  = new DataView(buf);
	const text  = [];
	const other = [];
	let offset  = 8;

	while (offset + 12 <= bytes.length) {
		const len       = view.getUint32(offset);
		const type      = LATIN1.decode(bytes.subarray(offset + 4, offset + 8));
		const dataStart = offset + 8;
		if (dataStart + len > bytes.length) break;

		const data = bytes.subarray(dataStart, dataStart + len);
		const dv   = new DataView(buf, dataStart, len);
		offset = dataStart + len + 4;   // len(4) + type(4) + data + crc(4)

		if (type === 'IEND') break;

		if (type === 'tEXt') {
			const nul = data.indexOf(0);
			if (nul < 0) continue;
			text.push({
				keyword: LATIN1.decode(data.subarray(0, nul)),
				value:   LATIN1.decode(data.subarray(nul + 1)),
			});

		} else if (type === 'zTXt') {
			const nul = data.indexOf(0);
			if (nul < 0) continue;
			const raw = await inflate(data.subarray(nul + 2));   // salta el byte de metodo de compresion
			text.push({
				keyword: LATIN1.decode(data.subarray(0, nul)),
				value:   raw ? LATIN1.decode(raw) : null,
				note:    raw ? 'zlib' : 'zlib - cannot inflate',
			});

		} else if (type === 'iTXt') {
			const nul1 = data.indexOf(0);
			if (nul1 < 0) continue;
			const compFlag = data[nul1 + 1];
			const nul2     = data.indexOf(0, nul1 + 3);   // fin de languageTag
			const nul3     = data.indexOf(0, nul2 + 1);   // fin de translatedKeyword
			if (nul2 < 0 || nul3 < 0) continue;

			const lang    = LATIN1.decode(data.subarray(nul1 + 3, nul2));
			const rawText = data.subarray(nul3 + 1);
			let value;
			if (compFlag === 1) {
				const inf = await inflate(rawText);
				value = inf ? UTF8.decode(inf) : null;
			} else {
				value = UTF8.decode(rawText);
			}
			text.push({
				keyword: LATIN1.decode(data.subarray(0, nul1)) + (lang ? ` [${lang}]` : ''),
				value,
				note:    compFlag === 1 ? (value == null ? 'zlib - cannot inflate' : 'zlib') : undefined,
			});

		} else if (type === 'pHYs' && len >= 9) {
			const ppuX = dv.getUint32(0);
			const ppuY = dv.getUint32(4);
			const unit = dv.getUint8(8);
			other.push(unit === 1
				? ['Resolution (pHYs)', `${dpi(ppuX)} x ${dpi(ppuY)} DPI`]
				: ['Pixel aspect (pHYs)', `${ppuX} : ${ppuY}`]);

		} else if (type === 'tIME' && len >= 7) {
			const year = dv.getUint16(0);
			other.push(['Last modified (tIME)',
				`${year}-${p2(dv.getUint8(2))}-${p2(dv.getUint8(3))} ${p2(dv.getUint8(4))}:${p2(dv.getUint8(5))}:${p2(dv.getUint8(6))} UTC`]);

		} else if (type === 'gAMA' && len >= 4) {
			other.push(['Gamma (gAMA)', String(dv.getUint32(0) / 100000)]);

		} else if (type === 'sRGB' && len >= 1) {
			other.push(['sRGB rendering intent', SRGB_INTENT[dv.getUint8(0)] ?? String(dv.getUint8(0))]);

		} else if (type === 'iCCP') {
			const nul = data.indexOf(0);
			if (nul >= 0) other.push(['ICC profile (iCCP)', LATIN1.decode(data.subarray(0, nul))]);
		}
	}

	return { text, other };
}

async function inflate(sub) {
	if (typeof DecompressionStream === 'undefined' || !sub.length) return null;
	try {
		const stream = new Blob([sub]).stream().pipeThrough(new DecompressionStream('deflate'));
		return new Uint8Array(await new Response(stream).arrayBuffer());
	} catch {
		return null;
	}
}

function dpi(ppu) {
	return Math.round(ppu * 0.0254);   // pixeles por metro -> pixeles por pulgada
}

function p2(num) {
	return String(num).padStart(2, '0');
}
