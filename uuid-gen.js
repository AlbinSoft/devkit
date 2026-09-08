export function init() {
	const countSel = document.getElementById('uuid-count');
	const output   = document.getElementById('uuid-output');
	const list     = document.getElementById('uuid-list');
	const copyAll  = document.getElementById('uuid-copy-all');

	for (let i = 1; i <= 20; i++) countSel.append(new Option(i, i, i === 1, i === 1));

	document.getElementById('uuid-form').addEventListener('submit', e => {
		e.preventDefault();
		const version = document.getElementById('uuid-version').value;
		const count   = +countSel.value;
		const uuids   = Array.from({ length: count }, version === 'v7' ? uuidv7 : uuidv4);
		renderList(uuids);
		output.hidden = false;
	});

	copyAll.addEventListener('click', () => {
		const uuids = [...list.querySelectorAll('code')].map(c => c.textContent).join('\n');
		navigator.clipboard.writeText(uuids).then(() => {
			copyAll.textContent = 'Copied!';
			setTimeout(() => { copyAll.textContent = 'Copy all'; }, 1500);
		});
	});

	function renderList(uuids) {
		list.innerHTML = '';
		for (const uuid of uuids) {
			const li   = document.createElement('li');
			const code = document.createElement('code');
			const btn  = document.createElement('button');
			code.textContent = uuid;
			btn.type         = 'button';
			btn.textContent  = 'Copy';
			btn.addEventListener('click', () => {
				navigator.clipboard.writeText(uuid).then(() => {
					btn.textContent = 'Copied!';
					setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
				});
			});
			li.append(code, btn);
			list.append(li);
		}
	}

	function uuidv4() {
		return crypto.randomUUID();
	}

	function uuidv7() {
		const bytes = new Uint8Array(16);
		crypto.getRandomValues(bytes);

		// 48-bit timestamp in ms
		const ts = BigInt(Date.now());
		bytes[0] = Number((ts >> 40n) & 0xffn);
		bytes[1] = Number((ts >> 32n) & 0xffn);
		bytes[2] = Number((ts >> 24n) & 0xffn);
		bytes[3] = Number((ts >> 16n) & 0xffn);
		bytes[4] = Number((ts >>  8n) & 0xffn);
		bytes[5] = Number( ts         & 0xffn);

		bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
		bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

		const h = Array.from(bytes, b => b.toString(16).padStart(2, '0'));
		return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10).join('')}`;
	}
}
