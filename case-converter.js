export function init() {
	const input  = document.getElementById('ccase-input');
	const output = document.getElementById('ccase-output');

	input.addEventListener('input', update);

	function update() {
		const text = input.value.trim();
		output.hidden = !text;
		if (!text) return;

		const words = tokenize(text);

		const conversions = [
			['camelCase',            words.map((w, i) => i === 0 ? w : cap(w)).join('')],
			['PascalCase',           words.map(cap).join('')],
			['snake_case',           words.join('_')],
			['SCREAMING_SNAKE_CASE', words.map(w => w.toUpperCase()).join('_')],
			['kebab-case',           words.join('-')],
			['dot.case',             words.join('.')],
			['Sentence case',        cap(words.join(' '))],
		['Title Case',           words.map(cap).join(' ')],
			['UPPER CASE',           words.map(w => w.toUpperCase()).join(' ')],
			['lower case',           words.join(' ')],
		];

		output.innerHTML = '';
		for (const [label, value] of conversions) {
			const dt   = document.createElement('dt');
			const dd   = document.createElement('dd');
			const code = document.createElement('code');
			const btn  = document.createElement('button');

			dt.textContent   = label;
			code.textContent = value;
			btn.type         = 'button';
			btn.textContent  = 'Copy';
			btn.addEventListener('click', () => {
				navigator.clipboard.writeText(value).then(() => {
					btn.textContent = 'Copied!';
					setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
				});
			});

			dd.append(code, btn);
			output.append(dt, dd);
		}
	}

	function tokenize(text) {
		return text
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
			.replace(/[\s\-_./]+/g, ' ')
			.trim()
			.split(' ')
			.filter(Boolean)
			.map(w => w.toLowerCase());
	}

	function cap(w) {
		return w.charAt(0).toUpperCase() + w.slice(1);
	}
}
