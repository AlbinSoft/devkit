export async function init() {
	fillBrowser();
	fillNetwork();
	fillCapabilities();
	fillGPU();
	// initColorPicker();
	await fillBattery();
	await fillStorage();
	await fillPermissions();
	await fillMediaDevices();
}

function el(id) { return document.getElementById(id); }
const na = 'n/a';

function fmt(bytes) {
	if (bytes == null) return na;
	const gb = bytes / 1e9;
	return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / 1e6).toFixed(1)} MB`;
}

function fmtTime(seconds) {
	if (!isFinite(seconds)) return '—';
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function fillBrowser() {
	el('br-ua').textContent = navigator.userAgent;

	const uad = navigator.userAgentData;
	if (uad) {
		const brand = uad.brands.find(b => !b.brand.includes('Not')) ?? uad.brands[0];
		el('br-name').textContent     = brand ? `${brand.brand} ${brand.version}` : na;
		el('br-platform').textContent = `${uad.platform}${uad.mobile ? ' (mobile)' : ''}`;
	} else {
		el('br-name').textContent     = na;
		el('br-platform').textContent = navigator.platform ?? na;
	}

	el('br-languages').textContent = navigator.languages?.join(', ') ?? na;

	const tz     = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const offset = -new Date().getTimezoneOffset();
	const sign   = offset >= 0 ? '+' : '-';
	const hh     = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
	const mm     = String(Math.abs(offset) % 60).padStart(2, '0');
	el('br-timezone').textContent = `${tz} (UTC${sign}${hh}:${mm})`;

	el('br-cookies').textContent = navigator.cookieEnabled ? 'Yes' : 'No';
	el('br-dnt').textContent     = navigator.doNotTrack === '1' ? 'Enabled' : navigator.doNotTrack === '0' ? 'Disabled' : na;
}

function fillNetwork() {
	el('br-online').textContent = navigator.onLine ? 'Online' : 'Offline';

	const conn = navigator.connection;
	if (!conn) {
		['br-conn-type', 'br-conn-speed', 'br-conn-rtt', 'br-conn-save'].forEach(id => el(id).textContent = na);
		return;
	}
	el('br-conn-type').textContent  = conn.effectiveType ?? na;
	el('br-conn-speed').textContent = conn.downlink != null ? `${conn.downlink} Mbps` : na;
	el('br-conn-rtt').textContent   = conn.rtt != null ? `${conn.rtt} ms` : na;
	el('br-conn-save').textContent  = conn.saveData ? 'Yes' : 'No';
}

async function fillBattery() {
	if (!navigator.getBattery) {
		['br-bat-level', 'br-bat-charging', 'br-bat-time'].forEach(id => el(id).textContent = na);
		return;
	}
	const bat = await navigator.getBattery();

	function update() {
		el('br-bat-level').textContent    = `${Math.round(bat.level * 100)}%`;
		el('br-bat-charging').textContent = bat.charging ? 'Yes' : 'No';
		el('br-bat-time').textContent     = bat.charging
			? (bat.chargingTime   < Infinity ? fmtTime(bat.chargingTime)   + ' until full'    : '—')
			: (bat.dischargingTime < Infinity ? fmtTime(bat.dischargingTime) + ' remaining'   : '—');
	}

	update();
	bat.addEventListener('levelchange',    update);
	bat.addEventListener('chargingchange', update);
}

async function fillStorage() {
	if (!navigator.storage?.estimate) {
		['br-storage-used', 'br-storage-quota'].forEach(id => el(id).textContent = na);
		return;
	}
	const { usage, quota } = await navigator.storage.estimate();
	el('br-storage-used').textContent  = fmt(usage);
	el('br-storage-quota').textContent = fmt(quota);
}

async function fillPermissions() {
	const perms = [
		['camera',        'br-perm-camera'],
		['microphone',    'br-perm-microphone'],
		['notifications', 'br-perm-notifications'],
		['geolocation',   'br-perm-geolocation'],
		['clipboard-read','br-perm-clipboard'],
	];

	const labels = { granted: 'Granted', denied: 'Denied', prompt: 'Prompt' };

	for (const [name, id] of perms) {
		try {
			const status = await navigator.permissions.query({ name });
			el(id).textContent = labels[status.state] ?? status.state;
			status.addEventListener('change', () => { el(id).textContent = labels[status.state] ?? status.state; });
		} catch {
			el(id).textContent = na;
		}
	}
}

async function fillMediaDevices() {
	if (!navigator.mediaDevices?.enumerateDevices) {
		['br-media-cameras', 'br-media-mics', 'br-media-speakers'].forEach(id => el(id).textContent = na);
		return;
	}
	const devices = await navigator.mediaDevices.enumerateDevices();
	el('br-media-cameras').textContent  = devices.filter(d => d.kind === 'videoinput').length;
	el('br-media-mics').textContent     = devices.filter(d => d.kind === 'audioinput').length;
	el('br-media-speakers').textContent = devices.filter(d => d.kind === 'audiooutput').length;
}

function fillGPU() {
	const canvas = document.createElement('canvas');
	const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
	if (!gl) {
		el('br-gpu-renderer').textContent = na;
		el('br-gpu-vendor').textContent   = na;
		return;
	}
	const ext = gl.getExtension('WEBGL_debug_renderer_info');
	el('br-gpu-renderer').textContent = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : na;
	el('br-gpu-vendor').textContent   = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)   : na;
}

function fillCapabilities() {
	const caps = [
		['WebGL',           () => !!document.createElement('canvas').getContext('webgl')],
		['WebGL2',          () => !!document.createElement('canvas').getContext('webgl2')],
		['WebAssembly',     () => typeof WebAssembly === 'object'],
		['WebRTC',          () => typeof RTCPeerConnection !== 'undefined'],
		['WebSockets',      () => typeof WebSocket !== 'undefined'],
		['Web Workers',     () => typeof Worker !== 'undefined'],
		['Service Workers', () => 'serviceWorker' in navigator],
		['IndexedDB',       () => 'indexedDB' in window],
		['Notifications',   () => 'Notification' in window],
		['Geolocation',     () => 'geolocation' in navigator],
		['Bluetooth',       () => 'bluetooth' in navigator],
		['USB',             () => 'usb' in navigator],
		['EyeDropper',      () => 'EyeDropper' in window],
		['Share API',       () => 'share' in navigator],
		['Vibration',       () => 'vibrate' in navigator],
	];

	const dl = el('br-caps');
	for (const [name, check] of caps) {
		let supported;
		try { supported = check(); } catch { supported = false; }
		dl.insertAdjacentHTML('beforeend',
			`<dt>${name}</dt><dd>${supported ? 'Yes' : 'No'}</dd>`);
	}
}

function initColorPicker() {
	const btn = el('br-pick-btn');
	const out = el('br-pick-out');

	if (!('EyeDropper' in window)) {
		btn.disabled = true;
		btn.textContent += ' (not available)';
		return;
	}

	btn.addEventListener('click', async () => {
		try {
			const { sRGBHex } = await new EyeDropper().open();
			out.innerHTML = `<span style="display:inline-block;width:1em;height:1em;background:${sRGBHex};border:1px solid #999;vertical-align:middle;margin-right:.4em"></span>${sRGBHex}`;
		} catch { /* cancelled */ }
	});
}
