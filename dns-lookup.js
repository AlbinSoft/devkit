export function init() {
	const form    = document.getElementById('dns-form');
	const statusEl= document.getElementById('dns-status');
	const output  = document.getElementById('dns-output');
	const tbody   = document.getElementById('dns-tbody');

	const STATUS = { 1: 'Format error', 2: 'Server failure', 3: 'Domain not found', 5: 'Query refused' };

	form.addEventListener('submit', async e => {
		e.preventDefault();
		const domain = document.getElementById('dns-domain').value.trim();
		const type   = document.getElementById('dns-type').value;

		if (!domain) return;

		output.hidden      = true;
		statusEl.textContent = 'Looking up…';

		try {
			const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
			const res = await fetch(url, { headers: { Accept: 'application/dns-json' } });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();

			if (data.Status !== 0) {
				statusEl.textContent = STATUS[data.Status] ?? `DNS error (status ${data.Status})`;
				return;
			}

			const answers = data.Answer ?? [];
			if (!answers.length) {
				statusEl.textContent = 'No records found.';
				return;
			}

			tbody.innerHTML = '';
			for (const rec of answers) {
				const tr = document.createElement('tr');
				[rec.name.replace(/\.$/, ''), rec.TTL + ' s', rec.data].forEach(text => {
					const td = document.createElement('td');
					td.textContent = text;
					tr.append(td);
				});
				tbody.append(tr);
			}

			statusEl.textContent = '';
			output.hidden = false;
		} catch (err) {
			statusEl.textContent = 'Error: ' + err.message;
		}
	});
}
