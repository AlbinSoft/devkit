export function init() {
	const statusEl = document.getElementById('wip-status');
	const content  = document.getElementById('wip-content');
	const refresh  = document.getElementById('wip-refresh');

	refresh.addEventListener('click', load);
	load();

	async function load() {
		content.hidden = true;
		refresh.hidden = true;
		statusEl.textContent = 'Detecting…';

		content.querySelectorAll('section').forEach(s => { s.hidden = false; });

		const [v4, v6, geo] = await Promise.all([
			fetch('https://api4.ipify.org?format=json').then(r => r.json()).catch(() => null),
			fetch('https://api6.ipify.org?format=json').then(r => r.json()).catch(() => null),
			fetch('https://ipapi.co/json/').then(r => r.json()).catch(() => null),
		]);

		if (!v4 && !geo) {
			statusEl.textContent = 'Could not retrieve IP information.';
			refresh.hidden = false;
			return;
		}

		fill('wip-ips', [
			['IPv4', v4?.ip ? ipCell(v4.ip) : na()],
			['IPv6', v6?.ip ? ipCell(v6.ip) : na()],
		]);

		if (geo && !geo.error) {
			const flag   = geo.country_code ? countryFlag(geo.country_code) : '';
			const utc    = geo.utc_offset ?? '';
			const utcFmt = utc ? utc.slice(0, 3) + ':' + utc.slice(3) : '';

			fill('wip-location', [
				['Country',     txt([flag, geo.country_name].filter(Boolean).join(' '))],
				['City',        txt(geo.city    ?? '—')],
				['Region',      txt(geo.region  ?? '—')],
				['Postal code', txt(geo.postal  ?? '—')],
				['Timezone',    txt(geo.timezone ? `${geo.timezone}${utcFmt ? ' (UTC' + utcFmt + ')' : ''}` : '—')],
				['Coordinates', geo.latitude != null
					? txt(coord(geo.latitude, 'N', 'S') + ', ' + coord(geo.longitude, 'E', 'W'))
					: na()],
			]);

			fill('wip-network', [
				['ISP', txt(geo.org?.replace(/^AS\d+\s*/, '') ?? '—')],
				['ASN', txt(geo.asn ?? '—')],
			]);
		} else {
			document.getElementById('wip-location').closest('section').hidden = true;
			document.getElementById('wip-network').closest('section').hidden  = true;
		}

		statusEl.textContent = '';
		content.hidden = false;
		refresh.hidden = false;
	}

	function fill(id, rows) {
		const dl = document.getElementById(id);
		dl.innerHTML = '';
		for (const [label, node] of rows) {
			const dt = document.createElement('dt');
			const dd = document.createElement('dd');
			dt.textContent = label;
			dd.append(node);
			dl.append(dt, dd);
		}
	}

	function txt(str) {
		const s = document.createElement('span');
		s.textContent = str;
		return s;
	}

	function na() {
		const s = document.createElement('span');
		s.textContent = 'Not available';
		s.className   = 'wip-na';
		return s;
	}

	function ipCell(ip) {
		const wrap = document.createElement('span');
		wrap.className = 'wip-ip';
		const code = document.createElement('code');
		code.textContent = ip;
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.textContent = 'Copy';
		btn.addEventListener('click', () => {
			navigator.clipboard.writeText(ip).then(() => {
				btn.textContent = 'Copied!';
				setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
			});
		});
		wrap.append(code, btn);
		return wrap;
	}

	function coord(val, pos, neg) {
		return `${Math.abs(val).toFixed(4)}° ${val >= 0 ? pos : neg}`;
	}

	function countryFlag(code) {
		return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
	}
}
