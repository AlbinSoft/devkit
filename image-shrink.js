import { getApiKey } from './api-keys.js';

const API_URL = 'https://apis.albinsoft.es/tinify/index.php';

const MIMES = {
	'image/jpeg': 'jpg',
	'image/png':  'png',
	'image/webp': 'webp',
	'image/avif': 'avif',
};

export function init() {
	const dropzone  = document.getElementById('ish-dropzone');
	const dropLabel = document.getElementById('ish-drop-label');
	const input     = document.getElementById('ish-input');
	const status    = document.getElementById('ish-status');
	const controls  = document.getElementById('ish-controls');
	const format    = document.getElementById('ish-format');
	const shrinkBtn = document.getElementById('ish-shrink');
	const resultsEl = document.getElementById('ish-results');
	const listEl    = document.getElementById('ish-list');

	let pendingFiles  = [];
	let resultEntries = [];

	dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		dropzone.classList.remove('drag-over');
		handleFiles(Array.from(e.dataTransfer.files));
	});

	input.addEventListener('change', () => {
		handleFiles(Array.from(input.files));
		input.value = '';
	});

	shrinkBtn.addEventListener('click', async () => {
		if (!pendingFiles.length) return;

		const apiKey = getApiKey('tinify');
		if (!apiKey) {
			setStatus('No API key configured. Set one in Settings.');
			return;
		}

		shrinkBtn.disabled = true;
		resultsEl.hidden   = true;
		clearResults();

		const convert = format.value;

		for (let i = 0; i < pendingFiles.length; i++) {
			const file = pendingFiles[i];
			setStatus(`Shrinking ${i + 1} / ${pendingFiles.length}…`);
			try {
				const url = convert ? `${API_URL}?convert=${convert}` : API_URL;
				const res = await fetch(url, {
					method: 'POST',
					headers: { 'X-Api-Key': apiKey },
					body: file,
				});

				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.error ? `${err.error}${err.detail ? ' — ' + err.detail : ''}` : `HTTP ${res.status}`);
				}

				const blob = await res.blob();
				const ext  = convert || MIMES[file.type] || file.name.split('.').pop();
				const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
				const entry = { blob, name, ext, url: null };
				resultEntries.push(entry);
				appendResult(listEl, entry, file);
			} catch (e) {
				appendError(listEl, file.name, e.message);
			}
		}

		setStatus('');
		resultsEl.hidden    = false;
		shrinkBtn.disabled  = false;
	});

	function handleFiles(files) {
		const valid = files.filter(f => MIMES[f.type]);
		if (!valid.length) {
			setStatus('No supported images (JPEG, PNG, WebP, AVIF).');
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

	function setStatus(msg) {
		status.textContent = msg;
	}
}

function appendResult(container, entry, originalFile) {
	const url = URL.createObjectURL(entry.blob);
	entry.url = url;

	const item = document.createElement('div');
	item.className = 'ish-item';

	const thumb = document.createElement('img');
	thumb.src       = url;
	thumb.className = 'ish-thumb';
	thumb.alt       = entry.name;

	const info = document.createElement('div');
	info.className = 'ish-item-info';

	const nameEl = document.createElement('span');
	nameEl.className   = 'ish-item-name';
	nameEl.textContent = entry.name;

	const saved  = ((1 - entry.blob.size / originalFile.size) * 100).toFixed(1);
	const metaEl = document.createElement('span');
	metaEl.className   = 'ish-item-meta';
	metaEl.textContent = `${kb(originalFile.size)} → ${kb(entry.blob.size)}  (−${saved}%)`;

	const actions = document.createElement('div');
	actions.className = 'ish-item-actions';

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
		saveBtn.addEventListener('click', () => saveFile(entry.blob, entry.name, entry.ext));
		actions.appendChild(saveBtn);
	}

	info.append(nameEl, metaEl, actions);
	item.append(thumb, info);
	container.appendChild(item);
}

function appendError(container, filename, message) {
	const item = document.createElement('div');
	item.className   = 'ish-item ish-error';
	item.textContent = 'Error: ' + filename + ' — ' + message;
	container.appendChild(item);
}

async function saveFile(blob, suggestedName, ext) {
	try {
		const handle   = await showSaveFilePicker({
			suggestedName,
			types: [{ description: blob.type, accept: { [blob.type]: ['.' + ext] } }],
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
