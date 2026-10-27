import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve();

test('PWA Manifest: manifest.json exists and contains required W3C properties', () => {
  const manifestPath = path.join(rootDir, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist at root');

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);

  assert.equal(manifest.name, 'Personal Assistant • Budget & Expense Planner');
  assert.equal(manifest.short_name, 'Personal Assistant');
  assert.equal(manifest.start_url, './index.html');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#0f172a');
  assert.equal(manifest.background_color, '#0f172a');
  assert.ok(Array.isArray(manifest.icons), 'manifest must declare icons array');
  assert.ok(manifest.icons.length >= 2, 'manifest must have at least 2 icon sizes');
});

test('PWA Icons: Required PNG icon files exist with non-zero sizes', () => {
  const icon192 = path.join(rootDir, 'icons', 'icon-192.png');
  const icon512 = path.join(rootDir, 'icons', 'icon-512.png');

  assert.ok(fs.existsSync(icon192), 'icon-192.png must exist');
  assert.ok(fs.existsSync(icon512), 'icon-512.png must exist');

  assert.ok(fs.statSync(icon192).size > 100, 'icon-192.png must not be empty');
  assert.ok(fs.statSync(icon512).size > 100, 'icon-512.png must not be empty');
});

test('PWA Service Worker: sw.js exists and declares valid cache name and precache list', () => {
  const swPath = path.join(rootDir, 'sw.js');
  assert.ok(fs.existsSync(swPath), 'sw.js must exist at root');

  const content = fs.readFileSync(swPath, 'utf8');
  assert.match(content, /CACHE_NAME\s*=\s*'personal-assistant-v1\.[3456789]\.0'/, 'sw.js must declare valid cache name');
  assert.match(content, /addEventListener\('install'/, 'sw.js must handle install event');
  assert.match(content, /addEventListener\('activate'/, 'sw.js must handle activate event');
  assert.match(content, /addEventListener\('fetch'/, 'sw.js must handle fetch event');
});

test('PWA Discovery: index.html links to manifest and defines mobile meta tags', () => {
  const htmlPath = path.join(rootDir, 'index.html');
  const content = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(content.includes('<link rel="manifest" href="manifest.json">'), 'index.html must link to manifest.json');
  assert.ok(content.includes('<meta name="theme-color" content="#0f172a">'), 'index.html must define theme-color');
  assert.ok(content.includes('id="btn-install-pwa"'), 'index.html must contain install app button');
});
