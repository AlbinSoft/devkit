// node generate-sitemap.js
const { readFileSync, writeFileSync } = require('fs');

const BASE_URL = 'https://devkit.albin.es';
const REGISTRY = JSON.parse(readFileSync('registry.json', 'utf8'));
const TODAY    = new Date().toISOString().slice(0, 10);

const urls = [{ loc: BASE_URL + '/', priority: '1.0' }];

for (const group of REGISTRY) {
	for (const tool of group.tools) {
		if (tool.private) continue;
		urls.push({ loc: BASE_URL + tool.slug, priority: '0.8' });
	}
}

const xml = [
	'<?xml version="1.0" encoding="UTF-8"?>',
	'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
	...urls.map(({ loc, priority }) => [
		'  <url>',
		`    <loc>${loc}</loc>`,
		`    <lastmod>${TODAY}</lastmod>`,
		`    <priority>${priority}</priority>`,
		'  </url>',
	].join('\n')),
	'</urlset>',
].join('\n');

writeFileSync('sitemap.xml', xml, 'utf8');
console.log(`sitemap.xml written — ${urls.length} URLs`);
