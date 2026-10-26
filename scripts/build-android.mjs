// scripts/build-android.mjs
// Dual-Target Build Tool: Synchronizes web assets and compiles the Android APK

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const androidDir = path.resolve(rootDir, 'android');
const assetsDir = path.resolve(androidDir, 'app', 'src', 'main', 'assets', 'www');

console.log('====================================================');
console.log(' Personal Assistant - Dual-Target Android Packager ');
console.log('====================================================\n');

// 1. Prepare assets directory
console.log(`[1/4] Preparing asset directory: ${assetsDir}`);
if (fs.existsSync(assetsDir)) {
  fs.rmSync(assetsDir, { recursive: true, force: true });
}
fs.mkdirSync(assetsDir, { recursive: true });

// 2. Synchronize web assets
console.log('[2/4] Synchronizing root web files into Android assets...');
fs.copyFileSync(path.resolve(rootDir, 'index.html'), path.resolve(assetsDir, 'index.html'));

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirRecursive(path.resolve(rootDir, 'css'), path.resolve(assetsDir, 'css'));
copyDirRecursive(path.resolve(rootDir, 'js'), path.resolve(assetsDir, 'js'));

if (fs.existsSync(path.resolve(rootDir, 'icons'))) {
  copyDirRecursive(path.resolve(rootDir, 'icons'), path.resolve(assetsDir, 'icons'));
}
if (fs.existsSync(path.resolve(rootDir, 'manifest.json'))) {
  fs.copyFileSync(path.resolve(rootDir, 'manifest.json'), path.resolve(assetsDir, 'manifest.json'));
}
if (fs.existsSync(path.resolve(rootDir, 'sw.js'))) {
  fs.copyFileSync(path.resolve(rootDir, 'sw.js'), path.resolve(assetsDir, 'sw.js'));
}

const filesCount = fs.readdirSync(assetsDir, { recursive: true }).length;
console.log(`      Copied ${filesCount} assets into www/ container.`);

// 3. Compile Android APK via Gradle Wrapper
console.log('[3/4] Compiling Android APK with Gradle Wrapper...');
const javaHome = process.env.JAVA_HOME && !process.env.JAVA_HOME.endsWith('bin')
  ? process.env.JAVA_HOME
  : 'C:\\Program Files\\Java\\jdk-23';

const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const buildResult = spawnSync(gradlewCmd, ['assembleDebug', '--no-daemon'], {
  cwd: androidDir,
  env: {
    ...process.env,
    JAVA_HOME: javaHome
  },
  stdio: 'inherit',
  shell: true
});

if (buildResult.status !== 0) {
  console.error(`\n[ERROR] Gradle build failed with exit code ${buildResult.status}`);
  process.exit(1);
}

// 4. Verify output APK
const outputApk = path.resolve(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
console.log('\n[4/4] Verifying generated APK artifact...');
if (!fs.existsSync(outputApk)) {
  console.error(`[ERROR] Expected APK not found at: ${outputApk}`);
  process.exit(1);
}

const stats = fs.statSync(outputApk);
console.log(`\nSUCCESS: Android APK successfully built!`);
console.log(`Artifact Location: ${outputApk}`);
console.log(`Artifact Size:     ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
console.log('====================================================\n');
