// Verifies the 14-day freshness rule: every package added or changed in package-lock.json relative
// to a baseline git ref must be a stable release published on or before the cutoff date.
// Usage: node scripts/verify-dep-freshness.js --baseline <git-ref> --cutoff <YYYY-MM-DD> [--out <file.md>]
// No dependencies; uses the global fetch of Node 18+. Exit code 1 if any package violates the rule
// or its publish date cannot be verified (such packages need explicit approval, never a silent pass).
const { execFileSync } = require('child_process');
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const baselineRef = opt('--baseline');
const cutoffArg = opt('--cutoff');
const outFile = opt('--out');
if (!baselineRef || !/^\d{4}-\d{2}-\d{2}$/.test(cutoffArg || '')) {
  console.error('Usage: node scripts/verify-dep-freshness.js --baseline <git-ref> --cutoff <YYYY-MM-DD> [--out <file>]');
  process.exit(2);
}
// Inclusive of the whole cutoff day.
const cutoff = new Date(`${cutoffArg}T23:59:59.999Z`);

const baseLock = JSON.parse(execFileSync('git', ['show', `${baselineRef}:package-lock.json`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const curLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

const nameOf = (key) => key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
const changed = [];
for (const [key, entry] of Object.entries(curLock.packages)) {
  if (!key || !entry.version || entry.link) continue;
  const before = baseLock.packages[key];
  if (!before || before.version !== entry.version) {
    changed.push({ key, name: nameOf(key), version: entry.version, from: before ? before.version : '(new)', dev: !!entry.dev });
  }
}

async function publishDate(name, version) {
  const url = `https://registry.npmjs.org/${name.replace('/', '%2F')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const doc = await res.json();
  return { date: doc.time && doc.time[version], url };
}

async function main() {
  const verifiedOn = new Date().toISOString().slice(0, 10);
  const byNameVersion = new Map();
  for (const c of changed) byNameVersion.set(`${c.name}@${c.version}`, c);
  const rows = [];
  const queue = [...byNameVersion.values()];
  const worker = async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      let status;
      let date = '';
      let url = '';
      try {
        const r = await publishDate(c.name, c.version);
        url = r.url;
        date = r.date ? r.date.slice(0, 10) : '';
        if (/-/.test(c.version)) status = 'FAIL prerelease';
        else if (!r.date) status = 'FAIL date unverified';
        else if (new Date(r.date) > cutoff) status = 'FAIL newer than cutoff';
        else status = 'ok';
      } catch (err) {
        status = `FAIL ${err.message}`;
      }
      rows.push({ ...c, date, url, status });
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  rows.sort((a, b) => a.name.localeCompare(b.name));

  const failures = rows.filter((r) => r.status !== 'ok');
  const lines = [
    `Freshness check against baseline \`${baselineRef}\`; cutoff ${cutoffArg} (inclusive); verified ${verifiedOn} via registry.npmjs.org.`,
    `${rows.length} added or changed package versions; ${failures.length} failing.`,
    '',
    '| Package | From | To | Scope | Published | Source | Status |',
    '|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.name} | ${r.from} | ${r.version} | ${r.dev ? 'dev' : 'prod'} | ${r.date} | ${r.url} | ${r.status} |`),
  ];
  const text = lines.join('\n') + '\n';
  if (outFile) fs.writeFileSync(outFile, text);
  console.log(text.split('\n').slice(0, 2).join('\n'));
  for (const f of failures) console.error(`FAIL ${f.name}@${f.version}: ${f.status}`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(2); });
