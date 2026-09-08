import { getApiKey } from './api-keys.js';

const API_URL = 'https://apis.albinsoft.es/bgrem/index.php';
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export function init() {
	const dropzone  = document.getElementById('bgr-dropzone');
	const dropLabel = document.getElementById('bgr-drop-label');
	const input     = document.getElementById('bgr-input');
	const status    = document.getElementById('bgr-status');
	const controls  = document.getElementById('bgr-controls');
	const model     = document.getElementById('bgr-model');
	const removeBtn = document.getElementById('bgr-remove');
	const resultsEl = document.getElementById('bgr-results');
	const listEl    = document.getElementById('bgr-list');

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

	removeBtn.addEventListener('click', async () => {
		if (!pendingFiles.length) return;

		const apiKey = getApiKey('bgrem');
		if (!apiKey) {
			setStatus('No API key configured. Set one in Settings.');
			return;
		}

		removeBtn.disabled = true;
		resultsEl.hidden    = true;
		clearResults();

		for (let i = 0; i < pendingFiles.length; i++) {
			const file = pendingFiles[i];
			setStatus(`Removing background ${i + 1} / ${pendingFiles.length}…`);
			try {
				const res = await fetch(`${API_URL}?model=${model.value}`, {
					method: 'POST',
					headers: { 'X-Api-Key': apiKey },
					body: file,
				});

				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.error ?? `HTTP ${res.status}`);
				}

				const blob  = await res.blob();
				const name  = file.name.replace(/\.[^.]+$/, '') + '.png';
				const entry = { blob, name, url: null };
				resultEntries.push(entry);
				appendResult(listEl, entry, file);
			} catch (e) {
				appendError(listEl, file.name, e.message);
			}
		}

		setStatus('');
		resultsEl.hidden    = false;
		removeBtn.disabled  = false;
	});

	function handleFiles(files) {
		const valid = files.filter(f => ACCEPTED.includes(f.type));
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

	function setStatus(msg) {
		status.textContent = msg;
	}
}

function appendResult(container, entry, originalFile) {
	const url = URL.createObjectURL(entry.blob);
	entry.url = url;

	const item = document.createElement('div');
	item.className = 'bgr-item';

	const thumb = document.createElement('img');
	thumb.src       = url;
	thumb.className = 'bgr-thumb';
	thumb.alt       = entry.name;

	const info = document.createElement('div');
	info.className = 'bgr-item-info';

	const nameEl = document.createElement('span');
	nameEl.className   = 'bgr-item-name';
	nameEl.textContent = entry.name;

	const metaEl = document.createElement('span');
	metaEl.className   = 'bgr-item-meta';
	metaEl.textContent = `${kb(originalFile.size)} → ${kb(entry.blob.size)}`;

	const actions = document.createElement('div');
	actions.className = 'bgr-item-actions';

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
		saveBtn.addEventListener('click', () => saveFile(entry.blob, entry.name));
		actions.appendChild(saveBtn);
	}

	info.append(nameEl, metaEl, actions);
	item.append(thumb, info);
	container.appendChild(item);
}

function appendError(container, filename, message) {
	const item = document.createElement('div');
	item.className   = 'bgr-item bgr-error';
	item.textContent = 'Error: ' + filename + ' — ' + message;
	container.appendChild(item);
}

async function saveFile(blob, suggestedName) {
	try {
		const handle   = await showSaveFilePicker({
			suggestedName,
			types: [{ description: 'PNG image', accept: { 'image/png': ['.png'] } }],
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
