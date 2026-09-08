export function init() {
	const textEl   = document.getElementById('sa-text');
	const toArray  = document.getElementById('sa-to-array');
	const toString = document.getElementById('sa-to-string');
	const opSel    = document.getElementById('sa-op');
	const doBtn    = document.getElementById('sa-do');
	const copyBtn  = document.getElementById('sa-copy');
	const undoBtn  = document.getElementById('sa-undo');
	const statusEl = document.getElementById('sa-status');

	const history = [];   // pila de valores previos para Undo

	textEl.addEventListener('input', updateStatus);

	toArray.addEventListener('click',  () => mutate(() => arrayLiteral(splitLines(textEl.value))));
	toString.addEventListener('click', () => mutate(() => parseArrayLiteral(textEl.value).join('\n')));
	doBtn.addEventListener('click',    () => mutate(() => applyOp(opSel.value, textEl.value)));

	copyBtn.addEventListener('click', () => {
		navigator.clipboard.writeText(textEl.value).then(() => flash(copyBtn, 'Copied!', 'Copy'));
	});

	undoBtn.addEventListener('click', () => {
		if (!history.length) return;
		textEl.value     = history.pop();
		undoBtn.disabled = !history.length;
		updateStatus();
	});

	updateStatus();

	function mutate(transform) {
		let result;
		try {
			result = transform();
		} catch (e) {
			setStatus('Error: ' + e.message);
			return;
		}
		history.push(textEl.value);
		if (history.length > 50) history.shift();
		undoBtn.disabled = false;
		textEl.value = result;
		updateStatus();
	}

	function updateStatus() {
		if (!textEl.value.trim()) { setStatus(''); return; }

		const lines   = splitLines(textEl.value);
		const numeric = lines.length > 0 && lines.every(isNumericLine);
		const looksLikeLiteral = !textEl.value.includes('\n') && /^\s*\[[\s\S]*\]\s*$/.test(textEl.value);

		setStatus(
			`${lines.length} line${lines.length === 1 ? '' : 's'}` +
			(numeric ? '  -  all numeric' : '') +
			(looksLikeLiteral ? '  -  looks like an array literal, try string2array' : '')
		);
	}

	function setStatus(message) {
		statusEl.textContent = message;
	}
}

/* ── Conversion lista <-> literal ───────────────────────── */

function splitLines(text) {
	return text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
}

function isNumericLine(line) {
	const trimmed = line.trim();
	return trimmed !== '' && Number.isFinite(Number(trimmed));
}

function arrayLiteral(lines) {
	const items = lines.filter(l => l.trim() !== '');
	if (items.length && items.every(isNumericLine)) {
		return '[' + items.map(l => l.trim()).join(', ') + ']';
	}
	return '[' + items.map(l => "'" + l.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'").join(', ') + ']';
}

function parseArrayLiteral(text) {
	let body = text.trim();
	if (body.startsWith('[') && body.endsWith(']')) body = body.slice(1, -1);

	const out = [];
	for (const part of splitTopLevel(body)) {
		const item = part.trim();
		if (item === '') continue;
		if (item.length >= 2 && (item[0] === '"' || item[0] === "'") && item[item.length - 1] === item[0]) {
			out.push(item.slice(1, -1).replace(/\\(['"\\])/g, '$1'));
		} else {
			out.push(item);
		}
	}
	return out;
}

// Trocea por comas que no esten dentro de comillas simples o dobles.
function splitTopLevel(str) {
	const parts = [];
	let buf   = '';
	let quote = null;
	for (let idx = 0; idx < str.length; idx++) {
		const ch = str[idx];
		if (quote) {
			buf += ch;
			if (ch === quote && str[idx - 1] !== '\\') quote = null;
		} else if (ch === '"' || ch === "'") {
			quote = ch;
			buf  += ch;
		} else if (ch === ',') {
			parts.push(buf);
			buf = '';
		} else {
			buf += ch;
		}
	}
	parts.push(buf);
	return parts;
}

/* ── Operaciones de lista ───────────────────────────────── */

function applyOp(op, text) {
	const lines = splitLines(text);
	switch (op) {
		case 'lower':       return lines.map(l => l.toLowerCase()).join('\n');
		case 'upper':       return lines.map(l => l.toUpperCase()).join('\n');
		case 'camel':       return lines.map(l => recase(l, 'camel')).join('\n');
		case 'pascal':      return lines.map(l => recase(l, 'pascal')).join('\n');
		case 'snake':       return lines.map(l => recase(l, 'snake')).join('\n');
		case 'kebab':       return lines.map(l => recase(l, 'kebab')).join('\n');
		case 'screaming':   return lines.map(l => recase(l, 'screaming')).join('\n');
		case 'sort':        return sortLines(lines, false).join('\n');
		case 'sortReverse': return sortLines(lines, true).join('\n');
		case 'unique':      return [...new Set(lines)].join('\n');
		case 'filterEmpty': return lines.filter(l => l.trim() !== '').join('\n');
		case 'sqlIn':       return sqlIn(lines);
		default:            return text;
	}
}

function sortLines(lines, reverse) {
	const nonEmpty   = lines.filter(l => l.trim() !== '');
	const allNumeric = nonEmpty.length > 0 && nonEmpty.every(isNumericLine);
	const sorted = [...lines].sort(allNumeric
		? (a, b) => Number(a) - Number(b)
		: (a, b) => a.localeCompare(b));
	return reverse ? sorted.reverse() : sorted;
}

function sqlIn(lines) {
	const items = lines.filter(l => l.trim() !== '');
	if (items.length && items.every(isNumericLine)) {
		return '(' + items.map(l => l.trim()).join(', ') + ')';
	}
	return '(' + items.map(l => "'" + l.replace(/'/g, "''") + "'").join(', ') + ')';
}

function recase(line, style) {
	const words = tokenize(line);
	if (!words.length) return line;   // deja tal cual lineas sin palabras (vacias, "___", ...)
	switch (style) {
		case 'camel':     return words.map((w, idx) => idx === 0 ? w : cap(w)).join('');
		case 'pascal':    return words.map(cap).join('');
		case 'snake':     return words.join('_');
		case 'kebab':     return words.join('-');
		case 'screaming': return words.map(w => w.toUpperCase()).join('_');
		default:          return line;
	}
}

// Mismo troceo de palabras que la herramienta Case converter.
function tokenize(text) {
	return text
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/[\s\-_./]+/g, ' ')
		.trim()
		.split(' ')
		.filter(Boolean)
		.map(w => w.toLowerCase());
}

function cap(word) {
	return word.charAt(0).toUpperCase() + word.slice(1);
}

function flash(btn, tempText, restoreText) {
	btn.textContent = tempText;
	setTimeout(() => { btn.textContent = restoreText; }, 1500);
}
