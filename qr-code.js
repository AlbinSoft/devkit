import qrcode from './qrcode-generator.js';

// El modo Byte debe interpretar el texto como UTF-8, no como Latin1
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

const QUIET = 4;         // modulos de zona de silencio a cada lado
const DARK  = '#000000';
const LIGHT = '#ffffff';

const PLACEHOLDERS = {
	text: 'Type or paste any text...',
	url:  'https://example.com/page',
};

export function init() {
	const form    = document.getElementById('qr-form');
	const typeSel = document.getElementById('qr-type');
	const eccSel  = document.getElementById('qr-ecc');
	const sizeSel = document.getElementById('qr-size');
	const textEl  = document.getElementById('qr-text');
	const errorEl = document.getElementById('qr-error');
	const output  = document.getElementById('qr-output');
	const preview = document.getElementById('qr-preview');
	const meta    = document.getElementById('qr-meta');
	const dlPng   = document.getElementById('qr-dl-png');
	const dlSvg   = document.getElementById('qr-dl-svg');
	const copyPng = document.getElementById('qr-copy-png');
	const copySvg = document.getElementById('qr-copy-svg');

	let lastCanvas = null;   // canvas del QR actual, para "Copy PNG"
	let lastSvg    = '';      // SVG del QR actual, para "Copy SVG"

	textEl.placeholder = PLACEHOLDERS[typeSel.value] || '';
	if (window.ClipboardItem) copyPng.hidden = false;

	form.addEventListener('input', update);
	form.addEventListener('change', update);

	typeSel.addEventListener('change', () => {
		textEl.placeholder = PLACEHOLDERS[typeSel.value] || '';
	});

	copySvg.addEventListener('click', () => {
		if (!lastSvg) return;
		navigator.clipboard.writeText(lastSvg).then(() => flash(copySvg, 'Copied!', 'Copy SVG'));
	});

	copyPng.addEventListener('click', () => {
		if (!lastCanvas) return;
		lastCanvas.toBlob(blob => {
			const item = new ClipboardItem({ 'image/png': blob });
			navigator.clipboard.write([item]).then(() => flash(copyPng, 'Copied!', 'Copy PNG'));
		}, 'image/png');
	});

	function update() {
		const raw = textEl.value;

		if (!raw.trim()) {
			output.hidden  = true;
			errorEl.hidden = true;
			lastCanvas = null;
			lastSvg    = '';
			return;
		}

		const payload = buildPayload(typeSel.value, raw);

		let qr;
		try {
			qr = qrcode(0, eccSel.value);
			qr.addData(payload);
			qr.make();
		} catch (err) {
			// qrcode-generator lanza cadenas, no objetos Error
			const reason = (err && err.message) ? err.message : String(err);
			errorEl.textContent = 'Cannot encode: ' + reason;
			errorEl.hidden = false;
			output.hidden  = true;
			return;
		}
		errorEl.hidden = true;

		const count  = qr.getModuleCount();
		const total  = count + QUIET * 2;
		const target = +sizeSel.value;
		const scale  = Math.max(1, Math.floor(target / total));
		const pxSize = total * scale;

		lastCanvas = renderCanvas(qr, count, scale, pxSize);
		lastSvg    = renderSvg(qr, count, total, pxSize);

		const pngUrl = lastCanvas.toDataURL('image/png');
		preview.src  = pngUrl;
		dlPng.href   = pngUrl;
		dlSvg.href   = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(lastSvg);

		meta.textContent = count + ' x ' + count + ' modules  -  ECC ' + eccSel.value + '  -  PNG ' + pxSize + ' px';
		output.hidden = false;
	}
}

// Convierte la entrada del usuario en la cadena que se codifica en el QR
function buildPayload(type, raw) {
	if (type === 'url') {
		const trimmed = raw.trim();
		if (!trimmed) return trimmed;
		// Si no trae esquema (http://, https://, mailto:...), asumimos https://
		return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
	}
	// text: se respeta tal cual, incluidos los saltos de linea
	return raw;
}

function renderCanvas(qr, count, scale, pxSize) {
	const canvas = document.createElement('canvas');
	canvas.width  = pxSize;
	canvas.height = pxSize;

	const ctx = canvas.getContext('2d');
	ctx.fillStyle = LIGHT;
	ctx.fillRect(0, 0, pxSize, pxSize);

	ctx.fillStyle = DARK;
	for (let row = 0; row < count; row++) {
		for (let col = 0; col < count; col++) {
			if (!qr.isDark(row, col)) continue;
			const x = (col + QUIET) * scale;
			const y = (row + QUIET) * scale;
			ctx.fillRect(x, y, scale, scale);
		}
	}
	return canvas;
}

function renderSvg(qr, count, total, pxSize) {
	// Un unico path con todos los modulos oscuros: fichero pequeno
	let path = '';
	for (let row = 0; row < count; row++) {
		for (let col = 0; col < count; col++) {
			if (!qr.isDark(row, col)) continue;
			path += 'M' + (col + QUIET) + ' ' + (row + QUIET) + 'h1v1h-1z';
		}
	}
	return [
		'<svg xmlns="http://www.w3.org/2000/svg" width="' + pxSize + '" height="' + pxSize + '"',
		' viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges">',
		'<rect width="' + total + '" height="' + total + '" fill="' + LIGHT + '"/>',
		'<path fill="' + DARK + '" d="' + path + '"/>',
		'</svg>',
	].join('');
}

function flash(btn, tempText, restoreText) {
	btn.textContent = tempText;
	setTimeout(() => { btn.textContent = restoreText; }, 1500);
}
