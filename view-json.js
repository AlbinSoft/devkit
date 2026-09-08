export function init() {
	const textarea    = document.getElementById('vjson-input');
	const fileInput   = document.getElementById('vjson-file');
	const dropzone    = document.getElementById('vjson-dropzone');
	const parseBtn    = document.getElementById('vjson-parse');
	const queryInput  = document.getElementById('vjson-query');
	const queryBtn    = document.getElementById('vjson-query-btn');
	const queryStatus = document.getElementById('vjson-query-status');
	const treeDiv     = document.getElementById('vjson-tree');
	const resultDiv   = document.getElementById('vjson-result');

	let currentData = null;
	let JSONPath    = null;

	dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		dropzone.classList.remove('drag-over');
		const file = e.dataTransfer.files[0];
		if (file) loadFile(file);
	});

	import('https://esm.sh/jsonpath-plus')
		.then(m => {
			const qi  = document.getElementById('vjson-query');
			const qb  = document.getElementById('vjson-query-btn');
			const qs  = document.getElementById('vjson-query-status');
			if (!qs) return;
			JSONPath = m.JSONPath;
			qi.disabled = false;
			qb.disabled = false;
			qs.textContent = '';
		})
		.catch(() => {
			const qs = document.getElementById('vjson-query-status');
			if (!qs) return;
			qs.textContent = 'Failed to load JSONPath.';
		});

	parseBtn.addEventListener('click', () => tryParse(textarea.value));

	fileInput.addEventListener('change', () => {
		const file = fileInput.files[0];
		if (!file) return;
		fileInput.value = '';
		loadFile(file);
	});

	queryBtn.addEventListener('click', runQuery);
	queryInput.addEventListener('keydown', e => { if (e.key === 'Enter') runQuery(); });

	function loadFile(file) {
		const reader = new FileReader();
		reader.onload = e => {
			textarea.value = e.target.result;
			tryParse(e.target.result);
		};
		reader.readAsText(file);
	}

	function tryParse(text) {
		try {
			currentData = JSON.parse(text);
			treeDiv.innerHTML = '';
			treeDiv.appendChild(renderNode(currentData, null, 0));
			resultDiv.innerHTML = '';
		} catch (e) {
			treeDiv.innerHTML = '';
			treeDiv.textContent = 'Invalid JSON: ' + e.message;
			currentData = null;
		}
	}

	function runQuery() {
		if (!JSONPath || !currentData) return;
		const path = queryInput.value.trim();
		if (!path) return;
		resultDiv.innerHTML = '';
		try {
			const result = JSONPath({ path, json: currentData });
			if (!result.length) {
				resultDiv.textContent = 'No results.';
			} else {
				const wrap = result.length === 1 ? result[0] : result;
				resultDiv.appendChild(renderNode(wrap, null, 0));
			}
		} catch (e) {
			resultDiv.textContent = 'Invalid query: ' + e.message;
		}
	}
}

function renderNode(value, key, depth) {
	if (value === null || typeof value !== 'object') {
		return renderPrimitive(value, key);
	}
	return renderBranch(value, key, depth);
}

function renderPrimitive(value, key) {
	const div  = document.createElement('div');
	const type = value === null ? 'null' : typeof value;
	const keyHtml = key !== null ? `<span class="vjson-key">${esc(String(key))}</span>: ` : '';
	div.innerHTML = `${keyHtml}<span class="vjson-${type}">${esc(JSON.stringify(value))}</span>`;
	return div;
}

function renderBranch(value, key, depth) {
	const isArray       = Array.isArray(value);
	const entries       = isArray ? [...value.entries()] : Object.entries(value);
	const [open, close] = isArray ? ['[', ']'] : ['{', '}'];

	const details = document.createElement('details');
	if (depth <= 1) details.open = true;

	const summary  = document.createElement('summary');
	const keyHtml  = key !== null ? `<span class="vjson-key">${esc(String(key))}</span>: ` : '';
	summary.innerHTML = `${keyHtml}${open} <span class="vjson-count">${entries.length}</span> ${close}`;
	details.appendChild(summary);

	for (const [k, v] of entries) {
		details.appendChild(renderNode(v, k, depth + 1));
	}

	return details;
}

function esc(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
