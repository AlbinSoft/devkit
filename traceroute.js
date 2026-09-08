export function init() {
	const form      = document.getElementById('tr-form');
	const statusEl  = document.getElementById('tr-status');
	const output    = document.getElementById('tr-output');
	const pre       = document.getElementById('tr-pre');
	const stopBtn   = document.getElementById('tr-stop');
	const submitBtn = document.getElementById('tr-submit');
	let   es        = null;

	form.addEventListener('submit', e => {
		e.preventDefault();
		const host    = document.getElementById('tr-host').value.trim();
		const maxhops = document.getElementById('tr-maxhops').value;
		if (!host) return;
		start(host, maxhops);
	});

	stopBtn.addEventListener('click', () => {
		close();
		statusEl.textContent = 'Stopped.';
	});

	function start(host, maxhops) {
		close();
		pre.innerHTML        = '';
		output.hidden        = false;
		stopBtn.hidden       = false;
		submitBtn.disabled   = true;
		statusEl.textContent = '';

		es = new EventSource(`traceroute.php?host=${encodeURIComponent(host)}&maxhops=${encodeURIComponent(maxhops)}`);

		es.onmessage = e => {
			const data = JSON.parse(e.data);

			if (data.error) {
				statusEl.textContent = data.error;
				close();
				return;
			}
			if (data.line !== undefined) {
				appendLine(data.line);
			}
			if (data.done) {
				close();
			}
		};

		es.onerror = () => {
			if (es) {
				close();
				if (!statusEl.textContent) statusEl.textContent = 'Connection error.';
			}
		};
	}

	function close() {
		if (es) { es.close(); es = null; }
		stopBtn.hidden     = true;
		submitBtn.disabled = false;
	}

	function appendLine(line) {
		const span = document.createElement('span');
		span.textContent = line + '\n';
		// Líneas con al menos un salto respondido (contiene ms)
		if (/\d+\s*ms/i.test(line)) {
			span.className = 'tr-ok';
		// Líneas con todos los saltos sin respuesta (* * *)
		} else if (/^\s*\d+\s+\*\s+\*\s+\*/.test(line)) {
			span.className = 'tr-timeout';
		}
		pre.appendChild(span);
		pre.scrollTop = pre.scrollHeight;
	}
}
