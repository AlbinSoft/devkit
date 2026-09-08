const FORMATS = {
	'image/jpeg': { ext: 'jpg',  label: 'JPEG' },
	'image/png':  { ext: 'png',  label: 'PNG'  },
	'image/webp': { ext: 'webp', label: 'WebP' },
};

export function init() {
	const dropzone  = document.getElementById('ic-dropzone');
	const dropLabel = document.getElementById('ic-drop-label');
	const input     = document.getElementById('ic-input');
	const info      = document.getElementById('ic-info');
	const outputs   = document.getElementById('ic-outputs');

	dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		dropzone.classList.remove('drag-over');
		const file = e.dataTransfer.files[0];
		if (file) process(file);
	});

	input.addEventListener('change', () => {
		const file = input.files[0];
		if (file) process(file);
		input.value = '';
	});

	function process(file) {
		if (!FORMATS[file.type]) {
			info.textContent = 'Unsupported format: ' + file.type;
			return;
		}

		dropLabel.textContent = file.name;
		dropzone.classList.add('has-file');
		info.textContent = `${FORMATS[file.type].label}  ·  ${(file.size / 1024).toFixed(1)} KB  ·  ${file.name}`;
		outputs.innerHTML = '';

		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			const canvas = document.createElement('canvas');
			canvas.width  = img.naturalWidth;
			canvas.height = img.naturalHeight;
			canvas.getContext('2d').drawImage(img, 0, 0);

			for (const mime of Object.keys(FORMATS).filter(m => m !== file.type)) {
				canvas.toBlob(blob => addOutput(outputs, file.name, mime, blob), mime, 0.92);
			}
		};
		img.src = url;
	}
}

function addOutput(container, srcName, mime, blob) {
	const fmt  = FORMATS[mime];
	const name = srcName.replace(/\.[^.]+$/, '') + '.' + fmt.ext;
	const url  = URL.createObjectURL(blob);

	const section = document.createElement('section');

	const h3 = document.createElement('h3');
	h3.textContent = `${fmt.label}  ·  ${(blob.size / 1024).toFixed(1)} KB`;

	const preview = document.createElement('img');
	preview.src = url;
	preview.className = 'ic-preview';

	const btnRow = document.createElement('div');
	btnRow.className = 'ic-btn-row';

	const dlBtn = document.createElement('a');
	dlBtn.href        = url;
	dlBtn.download    = name;
	dlBtn.textContent = 'Download';
	dlBtn.className   = 'btn';
	btnRow.appendChild(dlBtn);

	if ('showSaveFilePicker' in window) {
		const saveBtn = document.createElement('button');
		saveBtn.type        = 'button';
		saveBtn.textContent = 'Save';
		saveBtn.addEventListener('click', () => saveFile(blob, name, mime, fmt.ext));
		btnRow.appendChild(saveBtn);
	}

	section.append(h3, preview, btnRow);
	container.appendChild(section);
}

async function saveFile(blob, suggestedName, mime, ext) {
	try {
		const handle   = await showSaveFilePicker({
			suggestedName,
			types: [{ description: FORMATS[mime].label, accept: { [mime]: ['.' + ext] } }],
		});
		const writable = await handle.createWritable();
		await writable.write(blob);
		await writable.close();
	} catch (e) {
		if (e.name !== 'AbortError') alert('Error saving: ' + e.message);
	}
}
