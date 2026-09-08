export function init() {
	const el = id => document.getElementById(id);

	function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

	function aspectRatio(w, h) {
		const d = gcd(w, h);
		return `${w / d}:${h / d}`;
	}

	function colorGamut() {
		if (matchMedia('(color-gamut: rec2020)').matches) return 'Rec2020';
		if (matchMedia('(color-gamut: p3)').matches)      return 'P3';
		if (matchMedia('(color-gamut: srgb)').matches)    return 'sRGB';
		return 'unknown';
	}

	function update() {
		const dpr = window.devicePixelRatio;

		el('sr-screen').textContent    = `${screen.width} × ${screen.height} px`;
		el('sr-physical').textContent  = `${Math.round(screen.width * dpr)} × ${Math.round(screen.height * dpr)} px`;
		el('sr-window').textContent    = `${window.innerWidth} × ${window.innerHeight} px`;
		el('sr-avail').textContent     = `${screen.availWidth} × ${screen.availHeight} px`;
		el('sr-aspect').textContent    = aspectRatio(window.innerWidth, window.innerHeight);
		el('sr-dpr').textContent       = `${dpr}x`;
		el('sr-color').textContent     = `${screen.colorDepth} bits`;
		el('sr-gamut').textContent     = colorGamut();
		el('sr-hdr').textContent       = matchMedia('(dynamic-range: high)').matches ? 'Yes' : 'No';
		el('sr-orientation').textContent = screen.orientation?.type ?? 'n/a';
		el('sr-touch').textContent     = navigator.maxTouchPoints > 0
			? `Yes (${navigator.maxTouchPoints} points)`
			: 'No';
	}

	update();
	window.addEventListener('resize', update);
	screen.orientation?.addEventListener('change', update);
}
