export function init() {
	const form      = document.getElementById('ping-form');
	const statusEl  = document.getElementById('ping-status');
	const output    = document.getElementById('ping-output');
	const pre       = document.getElementById('ping-pre');
	const stopBtn   = document.getElementById('ping-stop');
	const submitBtn = document.getElementById('ping-submit');
	let   es        = null;

	form.addEventListener('submit', e => {
		e.preventDefault();
		const host  = document.getElementById('ping-host').value.trim();
		const count = document.getElementById('ping-count').value;
		if (!host) return;
		start(host, count);
	});

	stopBtn.addEventListener('click', () => {
		close();
		statusEl.textContent = 'Stopped.';
	});

	function start(host, count) {
		close();
		pre.innerHTML        = '';
		output.hidden        = false;
		stopBtn.hidden       = false;
		submitBtn.disabled   = true;
		statusEl.textContent = '';

		es = new EventSource(`ping.php?host=${encodeURIComponent(host)}&count=${encodeURIComponent(count)}`);

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
		// Líneas con tiempo de respuesta
		if (/time[=<]\d|tiempo\s*=\s*\d|\d+\s*ms/i.test(line)) {
			span.className = 'ping-ok';
		// Líneas de timeout o inalcanzable
		} else if (/timed?\s*out|request\s*timed|unreachable|100\s*%\s*(loss|perd)|inalcanzable|perdido/i.test(line)) {
			span.className = 'ping-err';
		}
		pre.appendChild(span);
		pre.scrollTop = pre.scrollHeight;
	}
}
