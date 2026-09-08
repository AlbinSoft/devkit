export function init() {
	const textArea  = document.getElementById('hchk-text');
	const fileInput = document.getElementById('hchk-file');
	const dropzone  = document.getElementById('hchk-dropzone');
	const dropLabel = document.getElementById('hchk-drop-label');
	const hashInput = document.getElementById('hchk-hash');
	const algoSel   = document.getElementById('hchk-algo');
	const detectedEl= document.getElementById('hchk-detected');
	const statusEl  = document.getElementById('hchk-status');
	const resultDiv = document.getElementById('hchk-result');
	const verdictEl = document.getElementById('hchk-verdict');
	const computedEl= document.getElementById('hchk-computed');
	const copyBtn   = document.getElementById('hchk-copy');

	const MAX      = 100 * 1024 * 1024;
	const BY_LEN   = { 32: 'md5', 40: 'sha1', 64: 'sha256', 128: 'sha512' };
	let selectedFile = null;

	// Dropzone
	dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		dropzone.classList.remove('drag-over');
		const f = e.dataTransfer.files[0];
		if (f) setFile(f);
	});
	fileInput.addEventListener('change', () => {
		if (fileInput.files[0]) setFile(fileInput.files[0]);
		fileInput.value = '';
	});

	function setFile(file) {
		if (file.size > MAX) {
			statusEl.textContent = `File too large — max 100 MB (this file is ${(file.size / 1048576).toFixed(1)} MB).`;
			return;
		}
		selectedFile    = file;
		textArea.value  = '';
		dropLabel.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
		statusEl.textContent  = '';
	}

	textArea.addEventListener('input', () => {
		if (textArea.value) {
			selectedFile          = null;
			dropLabel.textContent = 'Or drop a file here — max 100 MB';
		}
	});

	// Auto-detect algorithm from hash length
	hashInput.addEventListener('input', () => {
		const h = hashInput.value.trim();
		const d = BY_LEN[h.length];
		detectedEl.textContent = (d && algoSel.value === 'auto')
			? `Detected: ${algoSel.querySelector(`[value="${d}"]`).textContent}`
			: '';
	});
	algoSel.addEventListener('change', () => { detectedEl.textContent = ''; });

	// Copy
	copyBtn.addEventListener('click', () => {
		navigator.clipboard.writeText(computedEl.textContent).then(() => {
			copyBtn.textContent = 'Copied!';
			setTimeout(() => { copyBtn.textContent = 'Copy hash'; }, 1500);
		});
	});

	// Submit
	document.getElementById('hchk-form').addEventListener('submit', async e => {
		e.preventDefault();

		const expected = hashInput.value.trim().toLowerCase();
		let algo = algoSel.value;

		if (algo === 'auto') {
			algo = BY_LEN[expected.length] ?? null;
			if (!algo && expected) {
				statusEl.textContent = 'Cannot auto-detect algorithm — select one manually or use a standard hash length.';
				return;
			}
			if (!algo) algo = 'sha256';
		}

		statusEl.textContent  = 'Computing…';
		resultDiv.hidden      = true;

		try {
			let buffer;
			if (selectedFile) {
				buffer = await selectedFile.arrayBuffer();
			} else if (textArea.value) {
				buffer = new TextEncoder().encode(textArea.value).buffer;
			} else {
				statusEl.textContent = 'Enter text or drop a file.';
				return;
			}

			const computed = await computeHash(new Uint8Array(buffer), algo);
			computedEl.textContent = computed;
			statusEl.textContent   = '';

			if (expected) {
				const match        = computed === expected;
				verdictEl.textContent = match ? '✓ Match' : '✗ No match';
				verdictEl.className   = match ? 'hchk-match' : 'hchk-nomatch';
				verdictEl.hidden      = false;
			} else {
				verdictEl.hidden = true;
			}

			resultDiv.hidden = false;
		} catch (err) {
			statusEl.textContent = 'Error: ' + err.message;
		}
	});

	async function computeHash(bytes, algo) {
		if (algo === 'md5') return md5(bytes);
		const name    = { sha1: 'SHA-1', sha256: 'SHA-256', sha512: 'SHA-512' }[algo];
		const hashBuf = await crypto.subtle.digest(name, bytes);
		return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
	}

	function md5(bytes) {
		const msgLen = bytes.length;
		const padLen = msgLen % 64 < 56 ? 56 - msgLen % 64 : 120 - msgLen % 64;
		const padded = new Uint8Array(msgLen + padLen + 8);
		padded.set(bytes);
		padded[msgLen] = 0x80;
		const dv = new DataView(padded.buffer);
		dv.setUint32(padded.length - 8, (msgLen * 8) >>> 0,          true);
		dv.setUint32(padded.length - 4, (msgLen / 0x20000000) >>> 0, true);

		const K = Uint32Array.from({ length: 64 }, (_, i) => (Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0);
		const S = [7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22,
		           5, 9,14,20, 5, 9,14,20, 5, 9,14,20, 5, 9,14,20,
		           4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23,
		           6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21];

		let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

		for (let i = 0; i < padded.length; i += 64) {
			const M = Uint32Array.from({ length: 16 }, (_, j) => dv.getUint32(i + j * 4, true));
			let A = a0, B = b0, C = c0, D = d0;

			for (let j = 0; j < 64; j++) {
				let F, g;
				if      (j < 16) { F = (B & C) | (~B & D); g = j; }
				else if (j < 32) { F = (D & B) | (~D & C); g = (5 * j + 1) % 16; }
				else if (j < 48) { F = B ^ C ^ D;           g = (3 * j + 5) % 16; }
				else             { F = C ^ (B | ~D);         g = (7 * j)     % 16; }

				F = (F + A + K[j] + M[g]) | 0;
				A = D; D = C; C = B;
				B = (B + ((F << S[j]) | (F >>> (32 - S[j])))) | 0;
			}

			a0 = (a0 + A) | 0;
			b0 = (b0 + B) | 0;
			c0 = (c0 + C) | 0;
			d0 = (d0 + D) | 0;
		}

		const out = new Uint8Array(16);
		const rv  = new DataView(out.buffer);
		rv.setUint32(0,  a0, true);
		rv.setUint32(4,  b0, true);
		rv.setUint32(8,  c0, true);
		rv.setUint32(12, d0, true);
		return Array.from(out).map(b => b.toString(16).padStart(2, '0')).join('');
	}
}
