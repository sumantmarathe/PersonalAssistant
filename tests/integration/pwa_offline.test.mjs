import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve();

test('PWA Precache Integrity: All assets declared in sw.js exist on filesystem and are accessible', () => {
  const swContent = fs.readFileSync(path.join(rootDir, 'sw.js'), 'utf8');
  
  // Extract PRECACHE_ASSETS array items
  const match = swContent.match(/const PRECACHE_ASSETS = \[([\s\S]*?)\];/);
  assert.ok(match, 'PRECACHE_ASSETS array must be defined in sw.js');

  const assets = match[1]
    .split(',')
    .map(line => line.trim().replace(/['"]/g, ''))
    .filter(line => line.length > 0 && line !== './');

  assert.ok(assets.length >= 6, 'Must precache core shell assets');

  for (const asset of assets) {
    const cleanPath = asset.startsWith('./') ? asset.slice(2) : asset;
    const fullPath = path.join(rootDir, cleanPath);
    assert.ok(fs.existsSync(fullPath), `Precache asset must exist: ${asset}`);
    assert.ok(fs.statSync(fullPath).size > 0, `Precache asset must not be empty: ${asset}`);
  }
});

test('PWA Dual-Target Parity: scripts/build-android.mjs script includes manifest, sw.js and icons', () => {
  const buildScript = fs.readFileSync(path.join(rootDir, 'scripts', 'build-android.mjs'), 'utf8');

  assert.ok(buildScript.includes('manifest.json'), 'Build script must synchronize manifest.json');
  assert.ok(buildScript.includes('sw.js'), 'Build script must synchronize sw.js');
  assert.ok(buildScript.includes('icons'), 'Build script must synchronize icons directory');
});
