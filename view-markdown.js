export function init() {
	const textarea   = document.getElementById('vmd-input');
	const fileInput  = document.getElementById('vmd-file');
	const dropzone   = document.getElementById('vmd-dropzone');
	const dropLabel  = document.getElementById('vmd-drop-label');
	const tabPreview = document.getElementById('vmd-tab-preview');
	const tabHtml    = document.getElementById('vmd-tab-html');
	const previewDiv = document.getElementById('vmd-preview');
	const sourcePre  = document.getElementById('vmd-html-source');
	const sourceCode = sourcePre.querySelector('code');

	let marked    = null;
	let DOMPurify = null;

	dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		dropzone.classList.remove('drag-over');
		const file = e.dataTransfer.files[0];
		if (file) loadFile(file);
	});

	Promise.all([
		import('https://esm.sh/marked'),
		import('https://esm.sh/dompurify'),
	])
		.then(([markedMod, dompurifyMod]) => {
			marked    = markedMod.marked;
			DOMPurify = dompurifyMod.default;
			dropLabel.textContent = 'Or drop a .md here';
			dropzone.classList.remove('disabled');
			fileInput.disabled = false;
			render();
		})
		.catch(() => {
			dropLabel.textContent = 'Failed to load parser.';
			dropzone.classList.add('error');
		});

	textarea.addEventListener('input', render);

	fileInput.addEventListener('change', () => {
		const file = fileInput.files[0];
		if (!file) return;
		fileInput.value = '';
		loadFile(file);
	});

	tabPreview.addEventListener('click', () => switchTab('preview'));
	tabHtml.addEventListener('click', () => switchTab('html'));

	function loadFile(file) {
		const reader = new FileReader();
		reader.onload = e => {
			textarea.value = e.target.result;
			render();
		};
		reader.readAsText(file);
	}

	function render() {
		if (!marked || !DOMPurify) return;
		const rawHtml   = marked.parse(textarea.value);
		const cleanHtml = DOMPurify.sanitize(rawHtml);
		previewDiv.innerHTML   = cleanHtml;
		sourceCode.textContent = cleanHtml;
	}

	function switchTab(tab) {
		const showPreview = tab === 'preview';
		tabPreview.classList.toggle('active', showPreview);
		tabHtml.classList.toggle('active', !showPreview);
		previewDiv.hidden = !showPreview;
		sourcePre.hidden  = showPreview;
	}
}
