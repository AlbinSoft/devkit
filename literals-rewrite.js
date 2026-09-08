export function init() {
	const btn      = document.getElementById('lr-pick');
	const input    = document.getElementById('lr-input');
	const status   = document.getElementById('lr-status');
	const dropzone = document.getElementById('lr-dropzone');

	dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop',      e => { e.preventDefault(); dropzone.classList.remove('drag-over'); const file = e.dataTransfer.files[0]; if (file) process(file, null); });

	btn.addEventListener('click', () => {
		if ('showOpenFilePicker' in window) pickWithFSAPI();
	});

	input.addEventListener('change', () => {
		const file = input.files[0];
		if (file) process(file, null);
		input.value = '';
	});

	async function pickWithFSAPI() {
		let fileHandle;
		try {
			[fileHandle] = await window.showOpenFilePicker({
				types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
				multiple: false,
			});
		} catch (e) {
			if (e.name !== 'AbortError') setStatus('Error opening file: ' + e.message, 'error');
			return;
		}
		const file = await fileHandle.getFile();
		process(file, fileHandle);
	}

	async function process(file, fileHandle) {
		setStatus('Processing…');

		let result;
		try {
			const text     = await file.text();
			const response = await fetch('literals-rewrite.php', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: text,
			});
			if (!response.ok) {
				const msg = await response.text();
				setStatus('Server error: ' + msg, 'error');
				return;
			}
			result = await response.text();
		} catch (e) {
			setStatus('Network error: ' + e.message, 'error');
			return;
		}

		if (fileHandle) {
			try {
				const writable = await fileHandle.createWritable();
				await writable.write(result);
				await writable.close();
				setStatus('Saved: ' + file.name, 'ok');
			} catch (e) {
				download(result, file.name);
				setStatus('No write permission. Downloaded: ' + file.name, 'ok');
			}
		} else {
			download(result, file.name);
			setStatus('Downloaded: ' + file.name, 'ok');
		}
	}

	function download(text, filename) {
		const blob = new Blob([text], { type: 'application/json' });
		const url  = URL.createObjectURL(blob);
		const a    = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function setStatus(msg, type = '') {
		status.textContent = msg;
		status.dataset.type = type;
	}
}
