const CACHE = 'devkit-v4';

self.addEventListener('install', e => {
	e.waitUntil(
		caches.open(CACHE).then(cache => cache.addAll(['/']))
	);
	self.skipWaiting();
});

self.addEventListener('activate', e => {
	e.waitUntil(
		caches.keys().then(keys =>
			Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
		)
	);
	self.clients.claim();
});

self.addEventListener('fetch', e => {
	const url = new URL(e.request.url);

	// registry.json: network-first (para ver herramientas nuevas), fallback a caché
	if (url.pathname.endsWith('registry.json')) {
		e.respondWith(networkFirst(e.request));
		return;
	}

	// Todo lo demás: cache-first (shell, herramientas, CDN)
	e.respondWith(cacheFirst(e.request));
});

async function cacheFirst(request) {
	const cached = await caches.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) {
		const cache = await caches.open(CACHE);
		cache.put(request, response.clone());
	}
	return response;
}

async function networkFirst(request) {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(CACHE);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		return caches.match(request);
	}
}
