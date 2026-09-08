export function init() {
	const input  = document.getElementById('url-input');
	const output = document.getElementById('url-output');

	document.getElementById('url-encode').addEventListener('click', () => {
		try {
			output.textContent = encodeURIComponent(input.value);
		} catch (e) {
			output.textContent = 'Error: ' + e.message;
		}
	});

	document.getElementById('url-decode').addEventListener('click', () => {
		try {
			output.textContent = decodeURIComponent(input.value.trim());
		} catch (e) {
			output.textContent = 'Error: secuencia inválida';
		}
	});
}
