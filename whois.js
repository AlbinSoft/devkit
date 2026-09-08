export function init() {
	const form      = document.getElementById('whois-form');
	const statusEl  = document.getElementById('whois-status');
	const output    = document.getElementById('whois-output');
	const pre       = document.getElementById('whois-pre');
	const serverEl  = document.getElementById('whois-server');
	const submitBtn = document.getElementById('whois-submit');

	form.addEventListener('submit', async e => {
		e.preventDefault();
		const q = document.getElementById('whois-query').value.trim();
		if (!q) return;

		output.hidden        = true;
		submitBtn.disabled   = true;
		statusEl.textContent = 'Querying…';

		try {
			const res  = await fetch(`whois.php?q=${encodeURIComponent(q)}`);
			const data = await res.json();

			if (data.error) {
				statusEl.textContent = data.error;
				return;
			}

			serverEl.textContent = `Server: ${data.server}`;
			pre.innerHTML        = colorize(data.text);
			statusEl.textContent = '';
			output.hidden        = false;
		} catch (err) {
			statusEl.textContent = 'Error: ' + err.message;
		} finally {
			submitBtn.disabled = false;
		}
	});

	// Escapa HTML y luego colorea las líneas clave: valor
	function colorize(text) {
		const escaped = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Líneas del tipo "Key: value" — la clave no puede empezar por % ni contener :
		return escaped.replace(
			/^([^%:\n][^:\n]*?)(:[ \t]+)(.*)/gm,
			'<span class="whois-key">$1</span><span class="whois-sep">$2</span>$3'
		);
	}
}
