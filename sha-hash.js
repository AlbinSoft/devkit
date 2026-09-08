export function init() {
	const textInput = document.getElementById('sha-input');
	const fileInput = document.getElementById('sha-file');
	const dropzone  = document.getElementById('sha-dropzone');
	const dropLabel = document.getElementById('sha-drop-label');
	const algo      = document.getElementById('sha-algo');
	const statusEl  = document.getElementById('sha-status');

	const MAX = 100 * 1024 * 1024;
	let selectedFile = null;

	// Dropzone
	dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		dropzone.classList.remove('drag-over');
		const f = e.dataTransfer.files[0];
		if (f) setFile(f);
	});
	fileInput.addEventListener('change', () => {
		if (fileInput.files[0]) setFile(fileInput.files[0]);
		fileInput.value = '';
	});

	function setFile(file) {
		if (file.size > MAX) {
			statusEl.textContent = `File too large — max 100 MB (this file is ${(file.size / 1048576).toFixed(1)} MB).`;
			return;
		}
		selectedFile           = file;
		textInput.value        = '';
		dropLabel.textContent  = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
		statusEl.textContent   = '';
		computeFile(file);
	}

	textInput.addEventListener('input', () => {
		if (textInput.value) {
			selectedFile          = null;
			dropLabel.textContent = 'Or drop a file here — max 100 MB';
		}
		computeText();
	});

	algo.addEventListener('change', () => {
		if (selectedFile) computeFile(selectedFile);
		else computeText();
	});

	document.getElementById('sha-form').addEventListener('submit', e => {
		e.preventDefault();
		if (selectedFile) computeFile(selectedFile);
		else computeText();
	});

	async function computeText() {
		const out = document.getElementById('sha-output');
		if (!out) return;
		if (!textInput.value) { out.textContent = ''; return; }
		const bytes = new TextEncoder().encode(textInput.value);
		out.textContent = await digest(bytes.buffer);
	}

	async function computeFile(file) {
		statusEl.textContent = 'Computing…';
		const out = document.getElementById('sha-output');
		if (!out) return;
		const buffer = await file.arrayBuffer();
		out.textContent      = await digest(buffer);
		statusEl.textContent = '';
	}

	async function digest(buffer) {
		const hashBuf = await crypto.subtle.digest(algo.value, buffer);
		return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
	}
}
