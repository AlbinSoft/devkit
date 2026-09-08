export function init() {
	const form   = document.getElementById('cidr-form');
	const errorEl= document.getElementById('cidr-error');
	const output = document.getElementById('cidr-output');

	form.addEventListener('submit', e => {
		e.preventDefault();
		const raw = document.getElementById('cidr-input').value.trim();
		errorEl.hidden = true;
		output.hidden  = true;

		try {
			const data = parse(raw);
			render(data);
			output.hidden = false;
		} catch (err) {
			errorEl.textContent = err.message;
			errorEl.hidden = false;
		}
	});

	function parse(input) {
		const m = input.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?:\/(\d{1,2}))?$/);
		if (!m) throw new Error('Invalid format — expected 192.168.1.0/24');

		const parts = m[1].split('.').map(Number);
		if (parts.some(p => p > 255)) throw new Error('Invalid IP address');

		const prefix = m[2] !== undefined ? parseInt(m[2], 10) : 32;
		if (prefix > 32) throw new Error('Prefix length must be 0–32');

		const ip        = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
		const mask      = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
		const wildcard  = (~mask) >>> 0;
		const network   = (ip & mask) >>> 0;
		const broadcast = (network | wildcard) >>> 0;
		const total     = Math.pow(2, 32 - prefix);
		const usable    = prefix >= 31 ? total : total - 2;
		const first     = prefix >= 31 ? network              : (network   + 1) >>> 0;
		const last      = prefix >= 31 ? broadcast            : (broadcast - 1) >>> 0;

		return { ip, prefix, mask, wildcard, network, broadcast, first, last, total, usable };
	}

	function render({ ip, prefix, mask, wildcard, network, broadcast, first, last, total, usable }) {
		const a = (ip >>> 24) & 255;
		const b = (ip >>> 16) & 255;

		const rows = [
			['IP address',       str(ip)],
			['Network',          str(network) + '/' + prefix],
			['Subnet mask',      str(mask)],
			['Wildcard mask',    str(wildcard)],
			['Network address',  str(network)],
			['Broadcast',        prefix >= 31 ? '— (point-to-point)' : str(broadcast)],
			['First host',       str(first)],
			['Last host',        str(last)],
			['Usable hosts',     usable.toLocaleString()],
			['Total addresses',  total.toLocaleString()],
			['IP type',          ipType(a, b)],
			['IP class',         ipClass(a)],
		];

		output.innerHTML = '';
		for (const [label, value] of rows) {
			const dt = document.createElement('dt');
			const dd = document.createElement('dd');
			dt.textContent = label;
			dd.textContent = value;
			output.append(dt, dd);
		}
	}

	function str(n) {
		return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
	}

	function ipType(a, b) {
		if (a === 10)                       return 'Private (RFC 1918)';
		if (a === 172 && b >= 16 && b <= 31) return 'Private (RFC 1918)';
		if (a === 192 && b === 168)          return 'Private (RFC 1918)';
		if (a === 127)                       return 'Loopback';
		if (a === 169 && b === 254)          return 'Link-local (APIPA)';
		if (a === 100 && b >= 64 && b <= 127) return 'Shared (RFC 6598)';
		if (a >= 224 && a < 240)            return 'Multicast';
		if (a >= 240)                       return 'Reserved';
		return 'Public';
	}

	function ipClass(a) {
		if (a < 128) return 'A';
		if (a < 192) return 'B';
		if (a < 224) return 'C';
		if (a < 240) return 'D';
		return 'E';
	}
}
