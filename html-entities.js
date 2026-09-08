export function init() {
	const input  = document.getElementById('htmle-input');
	const output = document.getElementById('htmle-output');
	const copyEl = document.getElementById('htmle-copy');

	document.getElementById('htmle-encode').addEventListener('click', () => {
		try {
			output.textContent = encode(input.value);
		} catch (e) {
			output.textContent = 'Error: ' + e.message;
		}
	});

	document.getElementById('htmle-decode').addEventListener('click', () => {
		try {
			output.textContent = decode(input.value);
		} catch (e) {
			output.textContent = 'Error: entidad invalida';
		}
	});

	copyEl.addEventListener('click', () => {
		const text = output.textContent;
		if (!text) return;
		navigator.clipboard.writeText(text)
			.then(() => {
				const orig         = copyEl.textContent;
				copyEl.textContent = 'Copied!';
				setTimeout(() => { copyEl.textContent = orig; }, 1500);
			})
			.catch(() => {
				/* fallback para entornos sin permisos de portapapeles */
				const range = document.createRange();
				range.selectNodeContents(output);
				const sel = window.getSelection();
				sel.removeAllRanges();
				sel.addRange(range);
				document.execCommand('copy');
				sel.removeAllRanges();
			});
	});
}

function encode(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function decode(str) {
	/* Usamos un textarea como parser: innerHTML lo decodifica,
	   .value lo devuelve como texto plano sin ejecutar nada. */
	const el     = document.createElement('textarea');
	el.innerHTML = str;
	return el.value;
}
