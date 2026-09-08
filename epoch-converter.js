const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';

// El reloj de la seccion "Now" se guarda a nivel de modulo para poder
// pararlo si se vuelve a entrar en la herramienta o si el DOM ya no existe.
let clockTimer = null;

export function init() {
	const input    = document.getElementById('epoch-input');
	const unitSel   = document.getElementById('epoch-unit');
	const nowBtn    = document.getElementById('epoch-now-btn');
	const outEl     = document.getElementById('epoch-out');
	const errEl     = document.getElementById('epoch-err');
	const dtEl      = document.getElementById('epoch-dt');
	const strEl     = document.getElementById('epoch-str');
	const revOutEl  = document.getElementById('epoch-rev-out');
	const revErrEl  = document.getElementById('epoch-rev-err');
	const clockEl   = document.getElementById('epoch-clock');

	input.addEventListener('input', convertForward);
	unitSel.addEventListener('change', convertForward);
	nowBtn.addEventListener('click', () => {
		input.value    = String(Date.now());
		unitSel.value  = 'ms';
		convertForward();
	});

	dtEl.addEventListener('input', () => convertBackward('dt'));
	strEl.addEventListener('input', () => convertBackward('str'));

	function convertForward() {
		const raw = input.value.trim();
		if (!raw) {
			outEl.hidden = true;
			errEl.hidden = true;
			return;
		}

		if (!/^-?\d+$/.test(raw)) {
			errEl.textContent = 'Enter an integer timestamp.';
			errEl.hidden = false;
			outEl.hidden = true;
			return;
		}

		const value = Number(raw);
		let ms;
		if (unitSel.value === 's')       ms = value * 1000;
		else if (unitSel.value === 'ms') ms = value;
		else                             ms = Math.abs(value) >= 1e12 ? value : value * 1000;   // auto

		const date = new Date(ms);
		if (isNaN(date)) {
			errEl.textContent = 'That timestamp is out of range.';
			errEl.hidden = false;
			outEl.hidden = true;
			return;
		}

		errEl.hidden = true;
		renderRows(outEl, [
			['ISO 8601 (UTC)',   date.toISOString()],
			['UTC',              date.toUTCString()],
			['Local (' + LOCAL_TZ + ')', date.toLocaleString()],
			['Relative',         relative(date)],
			['Weekday',          date.toLocaleDateString(undefined, { weekday: 'long' })],
			['ISO week',         isoYearWeek(date)],
			['Day of year',      String(dayOfYear(date))],
			['Seconds',          String(Math.floor(ms / 1000))],
			['Milliseconds',     String(ms)],
		]);
	}

	function convertBackward(source) {
		let date;
		if (source === 'dt') {
			if (!dtEl.value) { revOutEl.hidden = true; revErrEl.hidden = true; return; }
			date = new Date(dtEl.value);          // datetime-local se interpreta como hora local
		} else {
			if (!strEl.value.trim()) { revOutEl.hidden = true; revErrEl.hidden = true; return; }
			date = new Date(strEl.value.trim());
		}

		if (isNaN(date)) {
			revErrEl.textContent = 'Cannot parse that date.';
			revErrEl.hidden = false;
			revOutEl.hidden = true;
			return;
		}

		revErrEl.hidden = true;
		const ms = date.getTime();
		renderRows(revOutEl, [
			['Seconds',        String(Math.floor(ms / 1000))],
			['Milliseconds',   String(ms)],
			['ISO 8601 (UTC)', date.toISOString()],
		]);
	}

	function startClock() {
		if (clockTimer) clearInterval(clockTimer);
		tick();
		clockTimer = setInterval(tick, 1000);

		function tick() {
			if (!clockEl.isConnected) {   // se salio de la herramienta
				clearInterval(clockTimer);
				clockTimer = null;
				return;
			}
			const now = Date.now();
			renderRows(clockEl, [
				['Seconds',      String(Math.floor(now / 1000))],
				['Milliseconds', String(now)],
				['ISO 8601',     new Date(now).toISOString()],
			]);
		}
	}

	startClock();
}

/* ── Helpers ────────────────────────────────────────────── */

function renderRows(dl, rows) {
	dl.innerHTML = '';
	for (const [label, value] of rows) {
		if (value == null || value === '') continue;

		const dt   = document.createElement('dt');
		const dd   = document.createElement('dd');
		const code = document.createElement('code');
		const btn  = document.createElement('button');

		dt.textContent   = label;
		code.textContent = value;
		btn.type         = 'button';
		btn.textContent  = 'Copy';
		btn.addEventListener('click', () => {
			navigator.clipboard.writeText(value).then(() => {
				btn.textContent = 'Copied!';
				setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
			});
		});

		dd.append(code, btn);
		dl.append(dt, dd);
	}
	dl.hidden = !dl.children.length;
}

function relative(date) {
	const diffMs = date.getTime() - Date.now();
	const abs    = Math.abs(diffMs);
	const RANGES = [
		['year',   31536e6],
		['month',  2592e6],
		['week',   6048e5],
		['day',    864e5],
		['hour',   36e5],
		['minute', 6e4],
		['second', 1e3],
	];
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
	for (const [unit, unitMs] of RANGES) {
		if (abs >= unitMs || unit === 'second') return rtf.format(Math.round(diffMs / unitMs), unit);
	}
}

function isoYearWeek(date) {
	const d   = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const day = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - day);                       // jueves de esta semana ISO
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const week      = Math.ceil((((d - yearStart) / 864e5) + 1) / 7);
	return d.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

function dayOfYear(date) {
	const start = Date.UTC(date.getUTCFullYear(), 0, 0);
	const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
	return Math.floor((today - start) / 864e5);
}
