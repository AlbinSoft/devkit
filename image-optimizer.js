const FORMATS = {
	'image/jpeg': { ext: 'jpg',  label: 'JPEG', lossy: true  },
	'image/png':  { ext: 'png',  label: 'PNG',  lossy: false },
	'image/webp': { ext: 'webp', label: 'WebP', lossy: true  },
};

const ENCODERS = {
	'image/jpeg': () => import('https://esm.sh/@jsquash/jpeg'),
	'image/png':  () => import('https://esm.sh/@jsquash/png'),
	'image/webp': () => import('https://esm.sh/@jsquash/webp'),
};

export function init() {
	const dropzone     = document.getElementById('io-dropzone');
	const dropLabel    = document.getElementById('io-drop-label');
	const input        = document.getElementById('io-input');
	const status       = document.getElementById('io-status');
	const controls     = document.getElementById('io-controls');
	const qualityWrap  = document.getElementById('io-quality-wrap');
	const qualityRange = document.getElementById('io-quality');
	const qualityVal   = document.getElementById('io-quality-val');
	const optimizeBtn  = document.getElementById('io-optimize');
	const result       = document.getElementById('io-result');
	const sizesEl      = document.getElementById('io-sizes');
	const actionsEl    = document.getElementById('io-actions');

	let currentFile = null;

	dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		dropzone.classList.remove('drag-over');
		const file = e.dataTransfer.files[0];
		if (file) loadFile(file);
	});

	input.addEventListener('change', () => {
		const file = input.files[0];
		if (file) loadFile(file);
		input.value = '';
	});

	qualityRange.addEventListener('input', () => {
		qualityVal.value = qualityRange.value;
	});

	optimizeBtn.addEventListener('click', async () => {
		if (!currentFile) return;
		setStatus('Loading codec…');
		optimizeBtn.disabled = true;

		try {
			const mod     = await ENCODERS[currentFile.type]();
			const encode  = mod.encode ?? mod.default?.encode ?? mod.default;
			const quality = parseInt(qualityRange.value);

			setStatus('Optimizing…');
			const imageData = await fileToImageData(currentFile);
			const opts      = FORMATS[currentFile.type].lossy ? { quality } : { level: 6 };
			const buffer    = await encode(imageData, opts);
			const blob      = new Blob([buffer], { type: currentFile.type });
			const fmt       = FORMATS[currentFile.type];
			const saved     = ((1 - blob.size / currentFile.size) * 100).toFixed(1);

			setStatus('');
			sizesEl.textContent = `Original: ${kb(currentFile.size)}  →  Optimized: ${kb(blob.size)}  (−${saved}%)`;
			renderActions(actionsEl, blob, currentFile.name, currentFile.type, fmt.ext);
			result.hidden = false;
		} catch (e) {
			setStatus('Error optimizing: ' + e.message);
		} finally {
			optimizeBtn.disabled = false;
		}
	});

	function loadFile(file) {
		if (!FORMATS[file.type]) {
			setStatus('Unsupported format: ' + file.type);
			return;
		}
		currentFile = file;
		dropLabel.textContent = file.name;
		dropzone.classList.add('has-file');
		const fmt = FORMATS[file.type];
		setStatus(`${fmt.label}  ·  ${kb(file.size)}`);
		qualityWrap.hidden = !fmt.lossy;
		controls.hidden    = false;
		result.hidden      = true;
	}

	function setStatus(msg) {
		status.textContent = msg;
	}
}

async function fileToImageData(file) {
	const bitmap = await createImageBitmap(file);
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	canvas.getContext('2d').drawImage(bitmap, 0, 0);
	return canvas.getContext('2d').getImageData(0, 0, bitmap.width, bitmap.height);
}

function renderActions(container, blob, name, mime, ext) {
	container.innerHTML = '';
	const url = URL.createObjectURL(blob);

	const dlBtn = document.createElement('a');
	dlBtn.href        = url;
	dlBtn.download    = name;
	dlBtn.textContent = 'Download';
	dlBtn.className   = 'btn';
	container.appendChild(dlBtn);

	if ('showSaveFilePicker' in window) {
		const saveBtn = document.createElement('button');
		saveBtn.type        = 'button';
		saveBtn.textContent = 'Save';
		saveBtn.addEventListener('click', () => saveFile(blob, name, mime, ext));
		container.appendChild(saveBtn);
	}
}

async function saveFile(blob, suggestedName, mime, ext) {
	try {
		const handle   = await showSaveFilePicker({
			suggestedName,
			types: [{ description: mime, accept: { [mime]: ['.' + ext] } }],
		});
		const writable = await handle.createWritable();
		await writable.write(blob);
		await writable.close();
	} catch (e) {
		if (e.name !== 'AbortError') alert('Error saving: ' + e.message);
	}
}

function kb(bytes) {
	return (bytes / 1024).toFixed(1) + ' KB';
}
