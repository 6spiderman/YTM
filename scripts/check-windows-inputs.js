// Guards the Windows build inputs against accidental change during the Kubuntu migration.
// Usage: node scripts/check-windows-inputs.js [baselineRef] [--asar <path-to-app.asar> --out <listing.txt>]
// No dependencies beyond @electron/asar (already installed via electron-builder).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const baselineRef = args.find((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--'))) || 'win-baseline-1.0.0';

const failures = [];

function showBaseline(file) {
  return execFileSync('git', ['show', `${baselineRef}:${file}`], { encoding: 'utf8' });
}

// 1. electron-builder.yml must be byte-identical to the baseline.
if (showBaseline('electron-builder.yml') !== fs.readFileSync('electron-builder.yml', 'utf8')) {
  failures.push('electron-builder.yml differs from baseline');
}

// 2. The four existing npm scripts and the package name must be unchanged.
const base = JSON.parse(showBaseline('package.json'));
const cur = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const key of ['dev', 'build', 'test', 'lint']) {
  if (base.scripts[key] !== cur.scripts[key]) failures.push(`package.json script "${key}" changed`);
}
if (base.name !== cur.name) failures.push('package.json "name" changed');
for (const key of ['productName', 'desktopName']) {
  if (cur[key] !== undefined) failures.push(`package.json must not define "${key}"`);
}

// 3. Anything added under assets/ lands in the Windows installer.
const baseAssets = execFileSync('git', ['ls-tree', '-r', '--name-only', baselineRef, 'assets'], { encoding: 'utf8' })
  .split('\n').filter(Boolean).sort();
const curAssets = execFileSync('git', ['ls-files', 'assets'], { encoding: 'utf8' })
  .split('\n').filter(Boolean).sort();
if (JSON.stringify(baseAssets) !== JSON.stringify(curAssets)) {
  failures.push(`assets/ file list differs from baseline: ${JSON.stringify({ baseAssets, curAssets })}`);
}

// 4. Optional: list the built Windows app.asar and compare with the committed snapshot, if present.
const asarPath = flag('--asar');
if (asarPath) {
  const asar = require('@electron/asar');
  const listing = asar.listPackage(asarPath, { isPack: false })
    .map((p) => p.replace(/\\/g, '/'))
    .sort();
  const out = flag('--out');
  if (out) fs.writeFileSync(out, listing.join('\n') + '\n');
  const snapshot = path.join('docs', 'kubuntu', 'windows-asar-listing.txt');
  if (fs.existsSync(snapshot)) {
    const expected = fs.readFileSync(snapshot, 'utf8').split('\n').filter(Boolean);
    const added = listing.filter((p) => !expected.includes(p));
    const removed = expected.filter((p) => !listing.includes(p));
    if (added.length || removed.length) {
      failures.push(`app.asar listing differs from snapshot: added=${JSON.stringify(added)} removed=${JSON.stringify(removed)}`);
    }
  } else {
    console.warn(`No ${snapshot} snapshot committed; listing written to ${out || '(not written)'} for review.`);
  }
}

if (failures.length) {
  console.error('Windows build-input check FAILED:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log(`Windows build inputs match baseline ${baselineRef}.`);
