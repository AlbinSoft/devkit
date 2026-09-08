const STORAGE_KEY = 'apiKeys';

function readAll() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
	} catch {
		return {};
	}
}

export function getApiKey(service) {
	return readAll()[service] ?? '';
}

export function setApiKey(service, value) {
	const all = readAll();
	if (value) all[service] = value;
	else delete all[service];
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
