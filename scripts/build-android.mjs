// scripts/build-android.mjs
// Dual-Target Build Tool: Synchronizes web assets and compiles Android APK / App Bundle (AAB)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const androidDir = path.resolve(rootDir, 'android');
const assetsDir = path.resolve(androidDir, 'app', 'src', 'main', 'assets', 'www');

// Parse CLI flags
const args = process.argv.slice(2);
const isBundle = args.includes('--bundle');
const isRelease = args.includes('--release');
const isAll = args.includes('--all');

console.log('====================================================');
console.log(' Personal Assistant - Dual-Target Android Packager ');
if (isBundle) console.log(' Mode: Google Play Release App Bundle (.aab)');
else if (isRelease) console.log(' Mode: Production Release APK (.apk)');
else if (isAll) console.log(' Mode: Full Distribution Suite (APK + AAB)');
else console.log(' Mode: Development Debug APK (.apk)');
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

if (fs.existsSync(path.resolve(rootDir, 'privacy.html'))) {
  fs.copyFileSync(path.resolve(rootDir, 'privacy.html'), path.resolve(assetsDir, 'privacy.html'));
}

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
  fs.mkdirSync(path.resolve(assetsDir, 'icons'), { recursive: true });
  fs.copyFileSync(path.resolve(rootDir, 'icons', 'icon-192.png'), path.resolve(assetsDir, 'icons', 'icon-192.png'));
  fs.copyFileSync(path.resolve(rootDir, 'icons', 'icon-512.png'), path.resolve(assetsDir, 'icons', 'icon-512.png'));
}
if (fs.existsSync(path.resolve(rootDir, 'manifest.json'))) {
  fs.copyFileSync(path.resolve(rootDir, 'manifest.json'), path.resolve(assetsDir, 'manifest.json'));
}
if (fs.existsSync(path.resolve(rootDir, 'sw.js'))) {
  fs.copyFileSync(path.resolve(rootDir, 'sw.js'), path.resolve(assetsDir, 'sw.js'));
}

const filesCount = fs.readdirSync(assetsDir, { recursive: true }).length;
console.log(`      Copied ${filesCount} assets into www/ container.`);

// 3. Compile Android Artifacts via Gradle Wrapper
const javaHome = process.env.JAVA_HOME && !process.env.JAVA_HOME.endsWith('bin')
  ? process.env.JAVA_HOME
  : 'C:\\Program Files\\Java\\jdk-23';

const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

const gradleTasks = [];
if (isAll) {
  gradleTasks.push('assembleRelease', 'bundleRelease');
} else if (isBundle) {
  gradleTasks.push('bundleRelease');
} else if (isRelease) {
  gradleTasks.push('assembleRelease');
} else {
  gradleTasks.push('assembleDebug');
}

console.log(`[3/4] Compiling Android target with task(s): ${gradleTasks.join(', ')}...`);

const buildResult = spawnSync(gradlewCmd, [...gradleTasks, '--no-daemon'], {
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

// 4. Verify generated artifacts
console.log('\n[4/4] Verifying generated release artifact(s)...');
const artifacts = [];

if (isAll || isRelease) {
  artifacts.push({
    name: 'Production Release APK',
    path: path.resolve(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
  });
}
if (isAll || isBundle) {
  artifacts.push({
    name: 'Google Play App Bundle (.aab)',
    path: path.resolve(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab')
  });
}
if (!isAll && !isRelease && !isBundle) {
  artifacts.push({
    name: 'Development Debug APK',
    path: path.resolve(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
  });
}

console.log('====================================================');
for (const artifact of artifacts) {
  if (!fs.existsSync(artifact.path)) {
    console.error(`[ERROR] Expected artifact not found at: ${artifact.path}`);
    process.exit(1);
  }
  const stats = fs.statSync(artifact.path);
  console.log(`SUCCESS: ${artifact.name}`);
  console.log(` Artifact Path: ${artifact.path}`);
  console.log(` Artifact Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
}
console.log('====================================================\n');
