const UTF8      = new TextDecoder('utf-8');
const HASH_NAME = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

export function init() {
	const input        = document.getElementById('jwt-input');
	const errorEl       = document.getElementById('jwt-error');
	const output        = document.getElementById('jwt-output');
	const headerEl      = document.getElementById('jwt-header');
	const payloadEl     = document.getElementById('jwt-payload');
	const claimsEl      = document.getElementById('jwt-claims');
	const secretEl      = document.getElementById('jwt-secret');
	const algEl         = document.getElementById('jwt-alg');
	const b64El         = document.getElementById('jwt-secret-b64');
	const verifyBtn     = document.getElementById('jwt-verify');
	const verifyResult  = document.getElementById('jwt-verify-result');

	let currentToken = null;

	input.addEventListener('input', decode);
	verifyBtn.addEventListener('click', verify);

	function decode() {
		const raw = input.value.trim();
		clearVerifyResult();

		if (!raw) {
			output.hidden  = true;
			errorEl.hidden = true;
			currentToken   = null;
			return;
		}

		const parts = raw.split('.');
		if (parts.length !== 3) {
			showError('A JWT has three dot-separated parts: header.payload.signature');
			return;
		}

		let header;
		let payload;
		try {
			header = JSON.parse(UTF8.decode(b64urlToBytes(parts[0])));
		} catch {
			showError('Cannot decode the header (invalid Base64URL or JSON).');
			return;
		}
		try {
			payload = JSON.parse(UTF8.decode(b64urlToBytes(parts[1])));
		} catch {
			showError('Cannot decode the payload (invalid Base64URL or JSON).');
			return;
		}

		errorEl.hidden = true;
		currentToken   = raw;

		headerEl.textContent  = JSON.stringify(header, null, 2);
		payloadEl.textContent = JSON.stringify(payload, null, 2);
		renderClaims(payload);
		setupVerifyFor(header.alg);

		output.hidden = false;
	}

	function showError(message) {
		errorEl.textContent = message;
		errorEl.hidden      = false;
		output.hidden       = true;
		currentToken        = null;
	}

	function renderClaims(payload) {
		const rows = [];
		const now  = Date.now() / 1000;

		const TIME_CLAIMS = { iat: 'Issued at', nbf: 'Not before', exp: 'Expires' };
		for (const [claim, label] of Object.entries(TIME_CLAIMS)) {
			if (typeof payload[claim] !== 'number') continue;
			let note = '';
			if (claim === 'exp') note = payload.exp < now ? '  (EXPIRED)' : '  (in ' + humanDelta(payload.exp - now) + ')';
			if (claim === 'nbf' && payload.nbf > now) note = '  (not valid yet)';
			rows.push([label, isoUtc(new Date(payload[claim] * 1000)) + note]);
		}

		const TEXT_CLAIMS = { iss: 'Issuer', sub: 'Subject', aud: 'Audience', jti: 'JWT ID' };
		for (const [claim, label] of Object.entries(TEXT_CLAIMS)) {
			if (payload[claim] != null) rows.push([label, String(payload[claim])]);
		}

		claimsEl.innerHTML = '';
		for (const [label, value] of rows) {
			const dt = document.createElement('dt');
			const dd = document.createElement('dd');
			dt.textContent = label;
			dd.textContent = value;
			claimsEl.append(dt, dd);
		}
	}

	function setupVerifyFor(alg) {
		clearVerifyResult();
		const supported = typeof alg === 'string' && /^HS(256|384|512)$/.test(alg);
		if (supported) {
			algEl.value        = alg;
			algEl.disabled     = false;
			verifyBtn.disabled = false;
		} else {
			algEl.disabled     = true;
			verifyBtn.disabled = true;
			verifyResult.hidden      = false;
			verifyResult.className   = 'jwt-neutral';
			verifyResult.textContent = 'Verification here supports HS256/384/512 only. Token alg: ' + (alg ?? 'unknown') + '.';
		}
	}

	function clearVerifyResult() {
		verifyResult.hidden      = true;
		verifyResult.textContent = '';
		verifyResult.className    = '';
	}

	async function verify() {
		if (!currentToken) return;

		const secretRaw = secretEl.value;
		if (!secretRaw) {
			verifyResult.hidden      = false;
			verifyResult.className   = 'jwt-neutral';
			verifyResult.textContent = 'Enter the secret to verify.';
			return;
		}

		let secretBytes;
		try {
			secretBytes = b64El.checked ? b64urlToBytes(secretRaw) : new TextEncoder().encode(secretRaw);
		} catch {
			verifyResult.hidden      = false;
			verifyResult.className   = 'jwt-invalid';
			verifyResult.textContent = 'The secret is not valid Base64.';
			return;
		}

		const [h, p, s] = currentToken.split('.');
		const data      = new TextEncoder().encode(h + '.' + p);

		try {
			const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: HASH_NAME[algEl.value] }, false, ['verify']);
			const ok  = await crypto.subtle.verify('HMAC', key, b64urlToBytes(s), data);
			verifyResult.hidden      = false;
			verifyResult.className   = ok ? 'jwt-valid' : 'jwt-invalid';
			verifyResult.textContent = ok ? 'Signature is valid.' : 'Signature is INVALID for this secret.';
		} catch (e) {
			verifyResult.hidden      = false;
			verifyResult.className   = 'jwt-invalid';
			verifyResult.textContent = 'Verification failed: ' + e.message;
		}
	}
}

/* ── Helpers ────────────────────────────────────────────── */

// Acepta Base64URL y Base64 estandar, con o sin relleno.
function b64urlToBytes(str) {
	const clean  = str.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
	const padded = clean + '==='.slice((clean.length + 3) % 4);
	const bin    = atob(padded);
	const bytes  = new Uint8Array(bin.length);
	for (let idx = 0; idx < bin.length; idx++) bytes[idx] = bin.charCodeAt(idx);
	return bytes;
}

function isoUtc(date) {
	return isNaN(date) ? 'invalid date' : date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function humanDelta(seconds) {
	let remaining = Math.abs(Math.round(seconds));
	const UNITS   = [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]];
	const parts   = [];
	for (const [suffix, size] of UNITS) {
		if (remaining >= size) {
			parts.push(Math.floor(remaining / size) + suffix);
			remaining %= size;
		}
		if (parts.length === 2) break;
	}
	return parts.join(' ') || '0s';
}
