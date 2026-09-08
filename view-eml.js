export function init() {
	const dropzone   = document.getElementById('eml-dropzone');
	const dropLabel  = document.getElementById('eml-drop-label');
	const input      = document.getElementById('eml-input');
	const viewer     = document.getElementById('eml-viewer');
	const headersDiv = document.getElementById('eml-headers');
	const bodyDiv    = document.getElementById('eml-body');
	const attachDiv  = document.getElementById('eml-attachments');
	const attachSect = document.getElementById('eml-attachments-section');

	dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		dropzone.classList.remove('drag-over');
		const file = e.dataTransfer.files[0];
		if (file) readFile(file);
	});

	import('https://esm.sh/emailjs-mime-parser')
		.then(() => {
			const lbl = document.getElementById('eml-drop-label');
			const dz  = document.getElementById('eml-dropzone');
			const inp = document.getElementById('eml-input');
			if (!lbl) return;
			lbl.textContent = 'Drop an .eml here';
			dz.classList.remove('disabled');
			inp.disabled = false;

			inp.addEventListener('change', () => {
				const file = inp.files[0];
				if (!file) return;
				inp.value = '';
				readFile(file);
			});
		})
		.catch(() => {
			const lbl = document.getElementById('eml-drop-label');
			const dz  = document.getElementById('eml-dropzone');
			if (!lbl) return;
			lbl.textContent = 'Failed to load parser.';
			dz.classList.add('error');
		});

	function readFile(file) {
		const reader = new FileReader();
		reader.onload = e => {
			import('https://esm.sh/emailjs-mime-parser').then(({ default: parse }) => render(parse(e.target.result)));
		};
		reader.readAsText(file);
	}

	function render(tree) {
		viewer.hidden = false;

		headersDiv.innerHTML = '';
		const rows = [
			['From',    getHeader(tree, 'from')],
			['To',      getHeader(tree, 'to')],
			['CC',      getHeader(tree, 'cc')],
			['Subject', getHeader(tree, 'subject')],
			['Date',    getHeader(tree, 'date')],
		].filter(([, v]) => v);

		const dl = document.createElement('dl');
		for (const [label, value] of rows) {
			const dt = document.createElement('dt');
			dt.textContent = label;
			const dd = document.createElement('dd');
			dd.textContent = value;
			dl.append(dt, dd);
		}
		headersDiv.appendChild(dl);

		bodyDiv.innerHTML = '';
		const htmlPart  = findPart(tree, 'text/html');
		const plainPart = findPart(tree, 'text/plain');

		if (htmlPart) {
			const host   = document.createElement('div');
			const shadow = host.attachShadow({ mode: 'open' });
			shadow.innerHTML = decode(htmlPart);
			bodyDiv.appendChild(host);
		} else if (plainPart) {
			const pre = document.createElement('pre');
			pre.textContent = decode(plainPart);
			bodyDiv.appendChild(pre);
		}

		attachDiv.innerHTML = '';
		const attachments = findAttachments(tree);
		attachSect.hidden = !attachments.length;
		for (const node of attachments) {
			const name = getAttachmentName(node);
			const blob = new Blob([node.content], { type: node.contentType?.value || 'application/octet-stream' });
			const url  = URL.createObjectURL(blob);
			const a    = document.createElement('a');
			a.href     = url;
			a.download = name;
			a.textContent = name;
			attachDiv.appendChild(a);
		}
	}
}

function getHeader(node, name) {
	const h = node.headers[name];
	if (!h?.length) return '';
	const val = h[0].value;
	if (typeof val === 'string') return val;
	if (Array.isArray(val)) {
		return val.map(v => v.name ? `${v.name} <${v.address}>` : v.address).join(', ');
	}
	return String(val);
}

function findPart(node, mimeType) {
	if (node.contentType?.value === mimeType) return node;
	for (const child of (node.childNodes || [])) {
		const found = findPart(child, mimeType);
		if (found) return found;
	}
	return null;
}

function decode(node) {
	const charset = node.contentType?.params?.charset || 'utf-8';
	try {
		return new TextDecoder(charset).decode(node.content);
	} catch {
		return new TextDecoder('utf-8').decode(node.content);
	}
}

function findAttachments(node, result = []) {
	const disp = node.headers['content-disposition']?.[0]?.value;
	if (disp === 'attachment') {
		result.push(node);
	} else {
		for (const child of (node.childNodes || [])) {
			findAttachments(child, result);
		}
	}
	return result;
}

function getAttachmentName(node) {
	return node.headers['content-disposition']?.[0]?.params?.filename
		|| node.headers['content-type']?.[0]?.params?.name
		|| 'attachment';
}
