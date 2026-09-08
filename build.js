#!/usr/bin/env node
/*
 * Devkit build - produce a trimmed, deploy-ready copy of the site.
 *
 *   node build.js --target=public [--base=https://devkit.albin.es/] [--out=dist] [--buildid=abc123]
 *   node build.js --target=full   [--out=dist-full]
 *
 * target=public : drop tools with a non-empty "needs" and tools marked "private"
 * target=full   : drop only tools marked "private"
 *
 * No dependencies. CommonJS on purpose (the tools' own JS stays ES modules
 * loaded by the browser and is not touched here).
 */

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;

// --- args ---------------------------------------------------------------
const args = {};
for (const raw of process.argv.slice(2)) {
	const match = raw.match(/^--([^=]+)(?:=(.*))?$/);
	if (match) args[match[1]] = match[2] === undefined ? true : match[2];
}

const target = args.target || 'full';
if (target !== 'public' && target !== 'full') {
	console.error(`build: unknown --target "${target}" (use "public" or "full")`);
	process.exit(1);
}

const outDir  = path.resolve(ROOT, args.out || (target === 'public' ? 'dist' : 'dist-full'));
const base    = typeof args.base === 'string' ? args.base : '';
const buildId = typeof args.buildid === 'string'
	? args.buildid
	: new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 8);

// Ficheros compartidos que van en cualquier build.
const SHARED_FILES = [
	'index.html',
	'style.css',
	'api-keys.js',
	'sw.js',
	'manifest.json',
	'robots.txt',
	'favicon.ico',
	'favicon.png',
	'.htaccess',
];
const SHARED_DIRS = ['icos'];

// --- filtrar el registro ---------------------------------------------------
const registry = readJson(path.join(ROOT, 'registry.json'));
const dropped  = [];
let   kept     = 0;

const filtered = registry
	.map(group => {
		const tools = group.tools.filter(tool => {
			if (tool.private) {
				dropped.push(`${tool.name} (private)`);
				return false;
			}
			if (target === 'public' && Array.isArray(tool.needs) && tool.needs.length) {
				dropped.push(`${tool.name} (needs: ${tool.needs.join(', ')})`);
				return false;
			}
			return true;
		});
		kept += tools.length;
		return { ...group, tools };
	})
	.filter(group => group.tools.length);

// --- preparar carpeta de salida -----------------------------------------
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const missing = [];

function copyFile(rel) {
	const src = path.join(ROOT, rel);
	if (!fs.existsSync(src)) { missing.push(rel); return; }
	const dst = path.join(outDir, rel);
	fs.mkdirSync(path.dirname(dst), { recursive: true });
	fs.copyFileSync(src, dst);
}

function copyDir(srcDir, dstDir) {
	fs.mkdirSync(dstDir, { recursive: true });
	for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
		const src = path.join(srcDir, entry.name);
		const dst = path.join(dstDir, entry.name);
		if (entry.isDirectory()) copyDir(src, dst);
		else fs.copyFileSync(src, dst);
	}
}

// Ficheros de cada tool que sobrevive.
for (const group of filtered) {
	for (const tool of group.tools) {
		for (const key of ['html', 'css', 'js', 'php']) {
			if (tool[key]) copyFile(tool[key]);
		}
		if (Array.isArray(tool.assets)) {
			for (const asset of tool.assets) copyFile(asset);
		}
	}
}

// Librerias locales importadas por los JS ya copiados (qrcode-generator.js, exifr.js, ...).
const IMPORT_RE = /\bfrom\s+['"]\.\/([\w.-]+\.js)['"]/g;
for (const group of filtered) {
	for (const tool of group.tools) {
		if (!tool.js) continue;
		const jsPath = path.join(outDir, tool.js);
		if (!fs.existsSync(jsPath)) continue;
		const code = fs.readFileSync(jsPath, 'utf8');
		let match;
		while ((match = IMPORT_RE.exec(code)) !== null) copyFile(match[1]);
	}
}

// Compartidos.
for (const rel of SHARED_FILES) copyFile(rel);
for (const dir of SHARED_DIRS) {
	const src = path.join(ROOT, dir);
	if (fs.existsSync(src)) copyDir(src, path.join(outDir, dir));
}

// --- registro filtrado -------------------------------------------------
fs.writeFileSync(path.join(outDir, 'registry.json'), JSON.stringify(filtered, null, '\t') + '\n');

// --- sellar el nombre de cache del service worker ---------------------
patch(path.join(outDir, 'sw.js'), sw => sw.replace(/const CACHE = '[^']*';/, `const CACHE = 'devkit-${buildId}';`));

// --- public: sin PHP, sitemap y robots con el dominio real ------------
if (target === 'public') {
	for (const file of fs.readdirSync(outDir)) {
		if (file.endsWith('.php')) fs.rmSync(path.join(outDir, file));
	}
	if (base) {
		writeSitemap(filtered, base, path.join(outDir, 'sitemap.xml'));
		patch(path.join(outDir, 'robots.txt'), txt =>
			txt.replace(/^Sitemap:.*$/m, `Sitemap: ${base.replace(/\/$/, '')}/sitemap.xml`));
	} else {
		console.warn('build: --base not set, sitemap.xml not generated');
	}
}

// --- resumen ---------------------------------------------------------------
console.log(`build: target=${target}  out=${path.relative(ROOT, outDir) || '.'}  cache=devkit-${buildId}`);
console.log(`build: ${kept} tool(s) kept, ${dropped.length} dropped`);
for (const name of dropped) console.log(`  - ${name}`);

if (missing.length) {
	console.error('build: FAILED - referenced files not found:');
	for (const rel of missing) console.error(`  - ${rel}`);
	process.exit(1);
}

// --- helpers ---------------------------------------------------------------
function readJson(file) {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch (e) {
		console.error(`build: cannot read ${path.relative(ROOT, file)} - ${e.message}`);
		process.exit(1);
	}
}

function patch(file, fn) {
	if (!fs.existsSync(file)) return;
	fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));
}

function writeSitemap(groups, baseUrl, file) {
	const root = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
	const locs = [root];
	for (const group of groups) {
		for (const tool of group.tools) locs.push(root.replace(/\/$/, '') + tool.slug);
	}
	const body = locs.map(loc => `  <url><loc>${loc}</loc></url>`).join('\n');
	fs.writeFileSync(file, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
}
