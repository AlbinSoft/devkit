const LS_LANGUAGE = 'sqlb_language';
const LS_INDENT   = 'sqlb_indent';
const LS_CASE     = 'sqlb_case';

export function init() {
	const inputEl  = document.getElementById('sqlb-input');
	const langEl   = document.getElementById('sqlb-language');
	const indentEl = document.getElementById('sqlb-indent');
	const caseEl   = document.getElementById('sqlb-case');
	const btnEl    = document.getElementById('sqlb-btn');
	const wrapEl   = document.getElementById('sqlb-output-wrap');
	const outputEl = document.getElementById('sqlb-output');
	const copyEl   = document.getElementById('sqlb-copy');
	const statusEl = document.getElementById('sqlb-status');

	/* Restaurar seleccion guardada */
	restoreSelect(langEl,   LS_LANGUAGE);
	restoreSelect(indentEl, LS_INDENT);
	restoreSelect(caseEl,   LS_CASE);

	/* Guardar en localStorage al cambiar */
	langEl.addEventListener('change',   () => localStorage.setItem(LS_LANGUAGE, langEl.value));
	indentEl.addEventListener('change', () => localStorage.setItem(LS_INDENT,   indentEl.value));
	caseEl.addEventListener('change',   () => localStorage.setItem(LS_CASE,     caseEl.value));

	let format = null;

	setStatus('Loading sql-formatter...', false);

	import('https://esm.sh/sql-formatter')
		.then(m => {
			format = m.format;
			clearStatus();
			btnEl.disabled = false;
		})
		.catch(() => {
			setStatus('Failed to load sql-formatter.', true);
		});

	btnEl.disabled = true;

	btnEl.addEventListener('click', () => {
		const sql = inputEl.value.trim();
		if (!sql) return;

		clearStatus();

		const useTabs = indentEl.value === 'tab';

		try {
			const result = format(sql, {
				language:    langEl.value,
				tabWidth:    useTabs ? 2 : Number(indentEl.value),
				useTabs:     useTabs,
				keywordCase: caseEl.value,
			});
			outputEl.value = result;
			wrapEl.hidden  = false;
		} catch (e) {
			setStatus('Error: ' + e.message, true);
			wrapEl.hidden = true;
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

	function setStatus(msg, isError) {
		statusEl.textContent = msg;
		statusEl.className   = isError ? 'error' : '';
	}

	function clearStatus() {
		statusEl.textContent = '';
		statusEl.className   = '';
	}
}

function restoreSelect(el, key) {
	const saved = localStorage.getItem(key);
	if (!saved) return;
	/* Solo aplicar si el valor existe entre las opciones */
	const match = Array.from(el.options).find(o => o.value === saved);
	if (match) el.value = saved;
}
