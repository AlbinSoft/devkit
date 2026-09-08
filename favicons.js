const PNG_SIZES = [
	{ size: 16,  name: 'favicon-16x16.png' },
	{ size: 32,  name: 'favicon-32x32.png' },
	{ size: 120, name: 'apple-touch-icon-120x120.png' },
	{ size: 152, name: 'apple-touch-icon-152x152.png' },
	{ size: 180, name: 'apple-touch-icon.png' },
	{ size: 144, name: 'android-chrome-144x144.png' },
	{ size: 192, name: 'android-chrome-192x192.png' },
	{ size: 512, name: 'android-chrome-512x512.png' },
];

const ICO_SIZES = [16, 32, 48];

export function init() {
	const form     = document.getElementById('favicons-form');
	const output   = document.getElementById('favicons-output');
	const dropzone = document.getElementById('fav-dropzone');
	const dropLabel = document.getElementById('fav-drop-label');
	const fileInput = document.getElementById('fav-input');

	dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		dropzone.classList.remove('drag-over');
		const file = e.dataTransfer.files[0];
		if (file) {
			const dt = new DataTransfer();
			dt.items.add(file);
			fileInput.files = dt.files;
			setDropLabel(file.name);
		}
	});

	fileInput.addEventListener('change', () => {
		if (fileInput.files[0]) setDropLabel(fileInput.files[0].name);
	});

	function setDropLabel(name) {
		dropLabel.textContent = name;
		dropzone.classList.add('has-file');
	}

	form.addEventListener('submit', async e => {
		e.preventDefault();

		const file = document.getElementById('fav-input').files[0];
		if (!file) return;

		const url    = document.getElementById('fav-url').value.trim();
		const folder = normFolder(document.getElementById('fav-folder').value.trim());
		const name   = document.getElementById('fav-name').value.trim();
		const theme  = document.getElementById('fav-theme').value;
		const bg     = document.getElementById('fav-bg').value;

		output.textContent = 'Generating…';

		const img = await loadImage(file);

		const icons = await Promise.all(
			PNG_SIZES.map(async ({ size, name: filename }) => ({
				name: filename,
				size,
				blob: await renderToBlob(img, size),
			}))
		);

		icons.push({
			name: 'android-chrome-512x512-maskable.png',
			size: 512,
			blob: await renderMaskable(img, 512, bg),
		});

		const icoBlob = await generateIco(img);
		icons.unshift({ name: 'favicon.ico', size: 48, blob: icoBlob });

		renderOutput(output, icons, { url, folder, name, theme, bg });
	});
}

// --- Utilidades de imagen ---

function normFolder(raw) {
	if (!raw) return '/';
	if (!raw.startsWith('/')) raw = '/' + raw;
	if (!raw.endsWith('/'))   raw += '/';
	return raw;
}

function loadImage(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
		img.onerror = reject;
		img.src = url;
	});
}

function renderToBlob(img, size) {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size;
	canvas.getContext('2d').drawImage(img, 0, 0, size, size);
	return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function renderMaskable(img, size, bgColor) {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext('2d');
	// Fondo sólido
	ctx.fillStyle = bgColor;
	ctx.fillRect(0, 0, size, size);
	// Logo centrado con 10% de padding por lado (safe zone del estándar maskable)
	const pad   = size * 0.1;
	const inner = size - pad * 2;
	ctx.drawImage(img, pad, pad, inner, inner);
	return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// --- Generación de ICO ---

async function generateIco(img) {
	const pngBuffers = await Promise.all(
		ICO_SIZES.map(async size => {
			const blob = await renderToBlob(img, size);
			return blob.arrayBuffer();
		})
	);

	const count      = ICO_SIZES.length;
	const headerSize = 6;
	const dirSize    = 16;
	const dataOffset = headerSize + dirSize * count;
	const totalSize  = dataOffset + pngBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);

	const buffer = new ArrayBuffer(totalSize);
	const view   = new DataView(buffer);
	const bytes  = new Uint8Array(buffer);

	view.setUint16(0, 0, true);
	view.setUint16(2, 1, true);
	view.setUint16(4, count, true);

	let offset = dataOffset;
	for (let i = 0; i < count; i++) {
		const size = ICO_SIZES[i];
		const png  = pngBuffers[i];
		const dir  = headerSize + dirSize * i;

		view.setUint8 (dir +  0, size);
		view.setUint8 (dir +  1, size);
		view.setUint8 (dir +  2, 0);
		view.setUint8 (dir +  3, 0);
		view.setUint16(dir +  4, 1,  true);
		view.setUint16(dir +  6, 32, true);
		view.setUint32(dir +  8, png.byteLength, true);
		view.setUint32(dir + 12, offset,         true);

		bytes.set(new Uint8Array(png), offset);
		offset += png.byteLength;
	}

	return new Blob([buffer], { type: 'image/x-icon' });
}

// --- Construcción de metas y manifest ---

function buildMetas({ folder, theme }) {
	return [
		`<meta name="theme-color" content="${theme}">`,
		`<link rel="apple-touch-icon" sizes="120x120" href="${folder}apple-touch-icon-120x120.png">`,
		`<link rel="apple-touch-icon" sizes="152x152" href="${folder}apple-touch-icon-152x152.png">`,
		`<link rel="apple-touch-icon" sizes="180x180" href="${folder}apple-touch-icon.png">`,
		`<link rel="icon" type="image/png" sizes="16x16"  href="${folder}favicon-16x16.png">`,
		`<link rel="icon" type="image/png" sizes="32x32"  href="${folder}favicon-32x32.png">`,
		`<link rel="icon" type="image/png" sizes="192x192" href="${folder}android-chrome-192x192.png">`,
		`<link rel="icon" type="image/x-icon" href="${folder}favicon.ico" />`,
		`<link rel="shortcut icon" href="${folder}favicon.ico">`,
		`<link rel="manifest" href="/manifest.json">`,
	].join('\n');
}

function buildManifest({ url, folder, name, theme, bg }) {
	return JSON.stringify({
		id:               url,
		start_url:        url,
		name,
		short_name:       name,
		description:      '',
		display:          'standalone',
		theme_color:      theme,
		background_color: bg,
		shortcuts:        [],
		icons: [
			{ src: folder + 'android-chrome-192x192.png',          sizes: '192x192', type: 'image/png' },
			{ src: folder + 'android-chrome-512x512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: folder + 'android-chrome-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
		],
		screenshots: [],
	}, null, 4);
}

// --- Renderizado de resultados ---

function renderOutput(output, icons, config) {
	output.innerHTML = '';
	const metasHtml    = buildMetas(config);
	const manifestJson = buildManifest(config);

	// Iconos
	const secIconos = document.createElement('section');
	const h2Iconos  = document.createElement('h2');
	h2Iconos.textContent = 'Icons';
	secIconos.appendChild(h2Iconos);

	for (const { name, size, blob } of icons) {
		const url  = URL.createObjectURL(blob);
		const item = document.createElement('div');
		item.className = 'fav-icon-item';

		const img = document.createElement('img');
		img.src    = url;
		img.width  = Math.min(size, 48);
		img.height = Math.min(size, 48);

		const label = document.createElement('span');
		label.textContent = name;

		const link = document.createElement('a');
		link.href        = url;
		link.download    = name;
		link.textContent = 'Download';

		item.append(img, label, link);
		secIconos.appendChild(item);
	}

	const zipBtn = document.createElement('button');
	zipBtn.type        = 'button';
	zipBtn.textContent = 'Download all (ZIP)';
	zipBtn.addEventListener('click', () => downloadZip(icons, manifestJson));
	secIconos.appendChild(zipBtn);

	// Metas
	const secMetas = document.createElement('section');
	const h2Metas  = document.createElement('h2');
	h2Metas.textContent = 'Meta tags';
	const areaMetasEl = document.createElement('textarea');
	areaMetasEl.readOnly = true;
	areaMetasEl.rows     = 10;
	areaMetasEl.value    = metasHtml;
	const copyMetasBtn = document.createElement('button');
	copyMetasBtn.type        = 'button';
	copyMetasBtn.textContent = 'Copy';
	copyMetasBtn.addEventListener('click', () => navigator.clipboard.writeText(metasHtml));
	const metaBtns = document.createElement('div');
	metaBtns.className = 'fav-btn-row';
	metaBtns.appendChild(copyMetasBtn);
	secMetas.append(h2Metas, areaMetasEl, metaBtns);

	// Manifest
	const secManifest = document.createElement('section');
	const h2Manifest  = document.createElement('h2');
	h2Manifest.textContent = 'manifest.json';
	const areaManifestEl = document.createElement('textarea');
	areaManifestEl.readOnly = true;
	areaManifestEl.rows     = 25;
	areaManifestEl.value    = manifestJson;
	const copyManifestBtn = document.createElement('button');
	copyManifestBtn.type        = 'button';
	copyManifestBtn.textContent = 'Copy';
	copyManifestBtn.addEventListener('click', () => navigator.clipboard.writeText(manifestJson));
	const dlManifestBtn = document.createElement('button');
	dlManifestBtn.type        = 'button';
	dlManifestBtn.textContent = 'Download manifest.json';
	dlManifestBtn.addEventListener('click', () => {
		const blob = new Blob([manifestJson], { type: 'application/json' });
		const url  = URL.createObjectURL(blob);
		const a    = document.createElement('a');
		a.href = url; a.download = 'manifest.json'; a.click();
		URL.revokeObjectURL(url);
	});
	const manifestBtns = document.createElement('div');
	manifestBtns.className = 'fav-btn-row';
	manifestBtns.append(copyManifestBtn, dlManifestBtn);
	secManifest.append(h2Manifest, areaManifestEl, manifestBtns);

	output.append(secIconos, secMetas, secManifest);
}

// --- Descarga ZIP ---

async function downloadZip(icons, manifestJson) {
	const zip = new JSZip();
	for (const { name, blob } of icons) {
		zip.file(name, blob);
	}
	zip.file('manifest.json', manifestJson);
	const content = await zip.generateAsync({ type: 'blob' });
	const url = URL.createObjectURL(content);
	const a   = document.createElement('a');
	a.href = url; a.download = 'favicons.zip'; a.click();
	URL.revokeObjectURL(url);
}
