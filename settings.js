import { getApiKey, setApiKey } from './api-keys.js';

export function init() {
	const form   = document.getElementById('settings-form');
	const tinify = document.getElementById('settings-tinify');
	const bgrem  = document.getElementById('settings-bgrem');
	const status = document.getElementById('settings-status');

	tinify.value = getApiKey('tinify');
	bgrem.value  = getApiKey('bgrem');

	form.addEventListener('submit', e => {
		e.preventDefault();
		setApiKey('tinify', tinify.value.trim());
		setApiKey('bgrem', bgrem.value.trim());
		status.textContent = 'Saved.';
	});
}
