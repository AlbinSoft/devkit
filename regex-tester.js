const VALID_FLAGS   = 'gimsuy';
const MAX_HIGHLIGHTS = 1000;   // tope de <mark> para no reventar el DOM

export function init() {
	const patternEl = document.getElementById('rt-pattern');
	const flagsEl    = document.getElementById('rt-flags');
	const testEl     = document.getElementById('rt-test');
	const replaceEl  = document.getElementById('rt-replace');
	const errorEl    = document.getElementById('rt-error');
	const output     = document.getElementById('rt-output');
	const countEl    = document.getElementById('rt-count');
	const highlightEl = document.getElementById('rt-highlight');
	const listEl     = document.getElementById('rt-list');
	const replaceSection = document.getElementById('rt-replace-section');
	const replaceOut = document.getElementById('rt-replace-out');

	for (const el of [patternEl, flagsEl, testEl, replaceEl]) {
		el.addEventListener('input', run);
	}

	function run() {
		const pattern = patternEl.value;
		const flags   = normalizeFlags(flagsEl.value);

		if (flagsEl.value !== flags) flagsEl.value = flags;

		if (!pattern) {
			output.hidden  = true;
			errorEl.hidden = true;
			return;
		}

		let userRe;
		try {
			userRe = new RegExp(pattern, flags);
		} catch (e) {
			errorEl.textContent = e.message;
			errorEl.hidden = false;
			output.hidden  = true;
			return;
		}
		errorEl.hidden = true;

		// Para recorrer todas las coincidencias necesitamos el flag g.
		const globalRe = userRe.global ? userRe : new RegExp(pattern, flags + 'g');
		const test     = testEl.value;
		const matches  = [...test.matchAll(globalRe)];

		countEl.textContent   = String(matches.length);
		highlightEl.innerHTML = buildHighlight(test, matches);
		renderList(listEl, matches);

		if (replaceEl.value) {
			replaceSection.hidden   = false;
			replaceOut.textContent  = test.replace(userRe, replaceEl.value);
		} else {
			replaceSection.hidden = true;
		}

		output.hidden = false;
	}
}

/* ── Helpers ────────────────────────────────────────────── */

function normalizeFlags(raw) {
	const seen = [];
	for (const ch of raw) {
		if (VALID_FLAGS.includes(ch) && !seen.includes(ch)) seen.push(ch);
	}
	return seen.join('');
}

function escapeHtml(str) {
	return str.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
}

function buildHighlight(test, matches) {
	let html   = '';
	let cursor = 0;
	let shown  = 0;

	for (const match of matches) {
		if (shown >= MAX_HIGHLIGHTS) break;
		const start = match.index;
		const end   = start + match[0].length;

		html += escapeHtml(test.slice(cursor, start));
		html += end === start
			? '<mark class="rt-zero"></mark>'
			: '<mark>' + escapeHtml(test.slice(start, end)) + '</mark>';

		cursor = end;
		shown++;
	}
	html += escapeHtml(test.slice(cursor));
	return html;
}

function renderList(container, matches) {
	container.innerHTML = '';

	if (!matches.length) {
		const p = document.createElement('p');
		p.className   = 'rt-empty';
		p.textContent = 'No matches.';
		container.appendChild(p);
		return;
	}

	matches.forEach((match, idx) => {
		const block = document.createElement('div');
		block.className = 'rt-match';

		const head = document.createElement('div');
		head.className   = 'rt-match-head';
		head.textContent = `Match ${idx + 1}  ·  index ${match.index}`;
		block.appendChild(head);

		block.appendChild(row('full match', match[0]));

		for (let group = 1; group < match.length; group++) {
			block.appendChild(row('group ' + group, match[group]));
		}
		if (match.groups) {
			for (const [name, value] of Object.entries(match.groups)) {
				block.appendChild(row('group <' + name + '>', value));
			}
		}
		container.appendChild(block);
	});

	function row(label, value) {
		const line = document.createElement('div');
		line.className = 'rt-group';

		const tag = document.createElement('span');
		tag.className   = 'rt-group-label';
		tag.textContent = label;

		const code = document.createElement('code');
		code.textContent = value === undefined ? '(no match)' : value === '' ? '(empty string)' : value;
		if (value === undefined || value === '') code.classList.add('rt-muted');

		line.append(tag, code);
		return line;
	}
}
