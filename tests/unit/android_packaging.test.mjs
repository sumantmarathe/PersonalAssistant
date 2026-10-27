// tests/unit/android_packaging.test.mjs
// Unit Test Suite: Android App Packaging, Manifest, and Asset Synchronization (REQ-014, REQ-017)

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const androidDir = path.resolve(rootDir, 'android');

describe('Unit Test Suite: Android Packaging & Manifest Configuration (REQ-014, REQ-017)', () => {

  it('Verifies AndroidManifest.xml contains the required package and permissions', () => {
    const manifestPath = path.resolve(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
    assert.strictEqual(fs.existsSync(manifestPath), true, 'AndroidManifest.xml must exist');

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    assert.match(manifestContent, /android\.permission\.INTERNET/, 'Must declare INTERNET permission');
    assert.match(manifestContent, /android\.permission\.ACCESS_NETWORK_STATE/, 'Must declare ACCESS_NETWORK_STATE permission');
    assert.match(manifestContent, /\.MainActivity/, 'Must declare MainActivity entrypoint');
  });

  it('Verifies build.gradle.kts defines correct namespace, minSdk, and targetSdk', () => {
    const gradlePath = path.resolve(androidDir, 'app', 'build.gradle.kts');
    assert.strictEqual(fs.existsSync(gradlePath), true, 'app/build.gradle.kts must exist');

    const gradleContent = fs.readFileSync(gradlePath, 'utf8');
    assert.match(gradleContent, /namespace = "com\.personalassistant\.app"/, 'Namespace must be com.personalassistant.app');
    assert.match(gradleContent, /applicationId = "(com\.personalassistant\.app|com\.sumantmarathe\.personalassistant)"/, 'Application ID must be valid');
    assert.match(gradleContent, /minSdk = 26/, 'Min SDK must be 26');
    assert.match(gradleContent, /compileSdk = 36/, 'Compile SDK must be 36');
  });

  it('Verifies Android assets directory contains synchronized root web application files', () => {
    const assetsDir = path.resolve(androidDir, 'app', 'src', 'main', 'assets', 'www');
    assert.strictEqual(fs.existsSync(path.resolve(assetsDir, 'index.html')), true, 'index.html must be bundled');
    assert.strictEqual(fs.existsSync(path.resolve(assetsDir, 'css', 'style.css')), true, 'css/style.css must be bundled');
    assert.strictEqual(fs.existsSync(path.resolve(assetsDir, 'js', 'app.js')), true, 'js/app.js must be bundled');
    assert.strictEqual(fs.existsSync(path.resolve(assetsDir, 'js', 'budgetApp.js')), true, 'js/budgetApp.js must be bundled');
    assert.strictEqual(fs.existsSync(path.resolve(assetsDir, 'js', 'storage.js')), true, 'js/storage.js must be bundled');
    assert.strictEqual(fs.existsSync(path.resolve(assetsDir, 'js', 'googleDriveService.js')), true, 'js/googleDriveService.js must be bundled');
  });

  it('Verifies the compiled release App Bundle (.aab) artifact exists and is non-empty', () => {
    const aabPath = path.resolve(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
    assert.strictEqual(fs.existsSync(aabPath), true, 'app-release.aab must exist');
    const stats = fs.statSync(aabPath);
    assert.ok(stats.size > 1024 * 1024, 'App Bundle artifact must be greater than 1 MB');
  });

  it('Verifies the compiled debug APK artifact exists and is non-empty', () => {
    const apkPath = path.resolve(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    assert.strictEqual(fs.existsSync(apkPath), true, 'app-debug.apk must exist');
    const stats = fs.statSync(apkPath);
    assert.ok(stats.size > 1024 * 1024, 'APK artifact must be greater than 1 MB');
  });

});
