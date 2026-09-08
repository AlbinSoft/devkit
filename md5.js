export function init() {
	const form   = document.getElementById('md5-form');
	const input  = document.getElementById('md5-input');
	const output = document.getElementById('md5-output');

	form.addEventListener('submit', e => {
		e.preventDefault();
		output.textContent = md5(input.value);
	});
}

function md5(str) {
	const bytes = new TextEncoder().encode(str);

	// Padding: mensaje + 0x80 + ceros + longitud (64-bit LE) → múltiplo de 64 bytes
	const msgLen = bytes.length;
	const padLen = msgLen % 64 < 56 ? 56 - msgLen % 64 : 120 - msgLen % 64;
	const padded = new Uint8Array(msgLen + padLen + 8);
	padded.set(bytes);
	padded[msgLen] = 0x80;
	const dv = new DataView(padded.buffer);
	dv.setUint32(padded.length - 8, (msgLen * 8) >>> 0,              true);
	dv.setUint32(padded.length - 4, (msgLen / 0x20000000) >>> 0,     true);

	// Constantes K (floor(abs(sin(i+1)) * 2^32)) y desplazamientos S
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
