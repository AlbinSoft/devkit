export function init() {
	const input  = document.getElementById('b64-input');
	const output = document.getElementById('b64-output');

	document.getElementById('b64-encode').addEventListener('click', () => {
		try {
			const bytes  = new TextEncoder().encode(input.value);
			const binStr = String.fromCharCode(...bytes);
			output.textContent = btoa(binStr);
		} catch (e) {
			output.textContent = 'Error: ' + e.message;
		}
	});

	document.getElementById('b64-decode').addEventListener('click', () => {
		try {
			const binStr = atob(input.value.trim());
			const bytes  = Uint8Array.from(binStr, c => c.charCodeAt(0));
			output.textContent = new TextDecoder().decode(bytes);
		} catch (e) {
			output.textContent = 'Error: base64 inválido';
		}
	});
}
