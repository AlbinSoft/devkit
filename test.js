#!/usr/bin/env node
/*
 * Devkit registry validation - run in CI on every push and PR.
 *   node test.js
 * No dependencies.
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = __dirname;
const errors = [];

let registry;
try {
	registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));
} catch (e) {
	console.error(`registry.json does not parse: ${e.message}`);
	process.exit(1);
}

if (!Array.isArray(registry)) {
	console.error('registry.json: top level must be an array of groups');
	process.exit(1);
}

const slugs       = new Map();   // slug -> "Group / Tool"
const declaredPhp = new Set();
let   toolCount   = 0;

for (const group of registry) {
	if (!group || typeof group.name !== 'string' || !Array.isArray(group.tools)) {
		errors.push(`group without "name" or "tools": ${JSON.stringify(group).slice(0, 70)}`);
		continue;
	}

	for (const tool of group.tools) {
		toolCount++;
		const id = `${group.name} / ${tool.name || '(unnamed)'}`;

		if (!tool.name)  errors.push(`${id}: missing "name"`);
		if (!tool.title) errors.push(`${id}: missing "title"`);

		if (typeof tool.slug !== 'string' || !tool.slug.startsWith('/')) {
			errors.push(`${id}: "slug" must be a string starting with "/"`);
		} else if (slugs.has(tool.slug)) {
			errors.push(`${id}: duplicate slug "${tool.slug}" (also ${slugs.get(tool.slug)})`);
		} else {
			slugs.set(tool.slug, id);
		}

		for (const key of ['html', 'css', 'js']) {
			if (!tool[key]) { errors.push(`${id}: missing "${key}"`); continue; }
			if (!fs.existsSync(path.join(ROOT, tool[key]))) errors.push(`${id}: ${key} file not found: ${tool[key]}`);
		}

		if (tool.php) {
			declaredPhp.add(tool.php);
			if (!fs.existsSync(path.join(ROOT, tool.php))) errors.push(`${id}: php file not found: ${tool.php}`);
		}

		if (tool.needs !== undefined) {
			if (!Array.isArray(tool.needs)) {
				errors.push(`${id}: "needs" must be an array`);
			} else if (tool.needs.includes('php') && !tool.php) {
				errors.push(`${id}: needs "php" but no "php" file declared`);
			}
		}

		if (Array.isArray(tool.assets)) {
			for (const asset of tool.assets) {
				if (!fs.existsSync(path.join(ROOT, asset))) errors.push(`${id}: asset not found: ${asset}`);
			}
		}
	}
}

// Todo .php en la raiz debe pertenecer a alguna tool.
for (const file of fs.readdirSync(ROOT)) {
	if (file.endsWith('.php') && !declaredPhp.has(file)) {
		errors.push(`orphan php file, not referenced by any tool: ${file}`);
	}
}

if (errors.length) {
	console.error(`registry.json: ${errors.length} problem(s)`);
	for (const e of errors) console.error(`  - ${e}`);
	process.exit(1);
}

console.log(`registry.json OK - ${toolCount} tools in ${registry.length} groups, ${declaredPhp.size} PHP-backed`);
