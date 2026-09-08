export function init() {
	const input    = document.getElementById('jsonb-input');
	const indentEl = document.getElementById('jsonb-indent');
	const wrapEl   = document.getElementById('jsonb-output-wrap');
	const outputEl = document.getElementById('jsonb-output');
	const copyEl   = document.getElementById('jsonb-copy');

	document.getElementById('jsonb-format').addEventListener('click', () => {
		try {
			const parsed    = JSON.parse(input.value);
			const indentVal = indentEl.value === 'tab' ? '\t' : Number(indentEl.value);
			outputEl.value  = JSON.stringify(parsed, null, indentVal);
			wrapEl.hidden   = false;
		} catch (e) {
			outputEl.value = 'Error: ' + e.message;
			wrapEl.hidden  = false;
		}
	});

	document.getElementById('jsonb-minify').addEventListener('click', () => {
		try {
			const parsed   = JSON.parse(input.value);
			outputEl.value = JSON.stringify(parsed);
			wrapEl.hidden  = false;
		} catch (e) {
			outputEl.value = 'Error: ' + e.message;
			wrapEl.hidden  = false;
		}
	});

	copyEl.addEventListener('click', () => {
		if (!outputEl.value) return;
		navigator.clipboard.writeText(outputEl.value)
			.then(() => {
				const orig         = copyEl.textContent;
				copyEl.textContent = 'Copied!';
				setTimeout(() => { copyEl.textContent = orig; }, 1500);
			})
			.catch(() => {
				/* fallback para entornos sin permisos de portapapeles */
				outputEl.select();
				document.execCommand('copy');
			});
	});
}
