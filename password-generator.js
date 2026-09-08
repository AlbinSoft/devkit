export function init() {
	const form    = document.getElementById('pwgen-form');
	const errorEl = document.getElementById('pwgen-error');
	const output  = document.getElementById('pwgen-output');
	const barFill = document.getElementById('pwgen-bar-fill');
	const meta    = document.getElementById('pwgen-strength-meta');
	const list    = document.getElementById('pwgen-list');

	const lengthSel = document.getElementById('pwgen-length');
	const countSel  = document.getElementById('pwgen-count');

	for (let i = 8; i <= 24; i++) lengthSel.append(new Option(i, i, i === 16, i === 16));
	for (let i = 1; i <= 10; i++) countSel.append(new Option(i, i, i === 1, i === 1));

	form.addEventListener('submit', e => { e.preventDefault(); generate(); });

	function generate() {
		const length  = +lengthSel.value;
		const count   = +countSel.value;
		const noAmbig = document.getElementById('pwgen-noambig').checked;
		const AMBIG   = new Set('0O1Il');

		const SETS = [
			{ id: 'pwgen-upper',   chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
			{ id: 'pwgen-lower',   chars: 'abcdefghijklmnopqrstuvwxyz' },
			{ id: 'pwgen-digits',  chars: '0123456789' },
			{ id: 'pwgen-symbols', chars: '!@#$%^&*()-_=+[]{}|;:,.<>?' },
		];

		let charset = '';
		for (const { id, chars } of SETS) {
			if (document.getElementById(id).checked) charset += chars;
		}
		if (noAmbig) charset = [...charset].filter(c => !AMBIG.has(c)).join('');

		errorEl.hidden = true;
		if (!charset) {
			errorEl.textContent = 'Select at least one character set.';
			errorEl.hidden = false;
			output.hidden = true;
			return;
		}

		const passwords = Array.from({ length: count }, () => makePassword(charset, length));
		renderStrength(length * Math.log2(charset.length));
		renderList(passwords);
		output.hidden = false;
	}

	function makePassword(charset, length) {
		const rand = new Uint32Array(length);
		crypto.getRandomValues(rand);
		return Array.from(rand, n => charset[n % charset.length]).join('');
	}

	function renderStrength(entropy) {
		const LEVELS = [
			{ min: 80, label: 'Very strong', cls: 'pwgen-very-strong' },
			{ min: 60, label: 'Strong',      cls: 'pwgen-strong'      },
			{ min: 40, label: 'Fair',        cls: 'pwgen-fair'        },
			{ min:  0, label: 'Weak',        cls: 'pwgen-weak'        },
		];
		const level = LEVELS.find(l => entropy >= l.min);
		barFill.className     = level.cls;
		barFill.style.width   = Math.min(100, (entropy / 128) * 100) + '%';
		meta.textContent      = `${level.label} — ${Math.round(entropy)} bits of entropy`;
	}

	function renderList(passwords) {
		list.innerHTML = '';
		for (const pw of passwords) {
			const li   = document.createElement('li');
			const code = document.createElement('code');
			const btn  = document.createElement('button');
			code.textContent = pw;
			btn.type         = 'button';
			btn.textContent  = 'Copy';
			btn.addEventListener('click', () => {
				navigator.clipboard.writeText(pw).then(() => {
					btn.textContent = 'Copied!';
					setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
				});
			});
			li.append(code, btn);
			list.append(li);
		}
	}
}
