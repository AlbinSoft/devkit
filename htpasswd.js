export function init() {
	const form   = document.getElementById('htpasswd-form');
	const status = document.getElementById('htpasswd-status');

	document.getElementById('htpasswd-copy-hta').addEventListener('click', () => {
		navigator.clipboard.writeText(document.getElementById('htpasswd-htaccess').value);
	});
	document.getElementById('htpasswd-copy-htp').addEventListener('click', () => {
		navigator.clipboard.writeText(document.getElementById('htpasswd-htpasswd').value);
	});

	let bcrypt = null;
	status.textContent = 'Loading bcrypt…';
	import('https://esm.sh/bcryptjs')
		.then(m => {
			const s = document.getElementById('htpasswd-status');
			if (!s) return;
			bcrypt = m.default ?? m;
			s.textContent = '';
		})
		.catch(() => {
			const s = document.getElementById('htpasswd-status');
			if (s) s.textContent = 'Failed to load bcrypt library.';
		});

	form.addEventListener('submit', async e => {
		e.preventDefault();

		const st = document.getElementById('htpasswd-status');

		if (!bcrypt) {
			st.textContent = 'Still loading, please wait…';
			return;
		}

		const path     = document.getElementById('htpasswd-path').value.trim();
		const realm    = document.getElementById('htpasswd-realm').value.trim() || 'Restricted';
		const username = document.getElementById('htpasswd-user').value.trim();
		const password = document.getElementById('htpasswd-pass').value;

		if (!path || !username || !password) {
			st.textContent = 'Please fill in all fields.';
			return;
		}

		const output = document.getElementById('htpasswd-output');
		output.hidden = true;
		st.textContent = 'Generating…';

		try {
			const hash = await bcrypt.hash(password, 10);

			// Apache uses $2y$; bcryptjs produces $2b$ (functionally identical)
			const apacheHash = hash.replace(/^\$2b\$/, '$2y$');

			const htaEl = document.getElementById('htpasswd-htaccess');
			const htpEl = document.getElementById('htpasswd-htpasswd');
			const out   = document.getElementById('htpasswd-output');
			const s     = document.getElementById('htpasswd-status');
			if (!htaEl) return;

			htaEl.value  = ['AuthType Basic', `AuthName "${realm}"`, `AuthUserFile ${path}`, 'Require valid-user'].join('\n');
			htpEl.value  = `${username}:${apacheHash}`;
			s.textContent = '';
			out.hidden   = false;
		} catch (err) {
			const s = document.getElementById('htpasswd-status');
			if (s) s.textContent = 'Error: ' + err.message;
		}
	});
}
