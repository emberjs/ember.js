#!/usr/bin/env node
// scripts/bundle-modern-app-gate.mjs — CI verdict + job summary for
// `node scripts/bundle-modern-app.mjs … --boot --json <file>` runs.
//
//   node scripts/bundle-modern-app-gate.mjs <strict.json> [<loose.json> …]
//
// bundle-modern-app.mjs reports boot-checks but exits 0 when a variant fails to
// boot (its default local run includes the compat `gxt` variant, which has a
// known boot gap). This gate fails unless every variant in every given file was
// boot-checked and passed all of its checks, and no `--assert-native` run
// reported a violation. It prints the boot-JS bytes (raw / gzip / brotli,
// gxt runtime brotli) per variant, each gxt-native variant against the classic
// one of the same flavor, and appends the table to GITHUB_STEP_SUMMARY when set.
import { appendFileSync, readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/bundle-modern-app-gate.mjs <bundle-modern-app --json file>…');
  process.exit(2);
}

const fmt = (n) => n.toLocaleString('en-US');
const results = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')));
const problems = [];
const rows = [
  '| variant | flavor | boot JS raw | gzip | brotli | gxt runtime br | vs classic (br) | boot-check |',
  '|---|---|---|---|---|---|---|---|',
];
for (const r of results) {
  const classic = results.find(
    (c) => c.flavor === r.flavor && c.variant.startsWith('classic') && c !== r
  );
  const delta =
    classic && !r.variant.startsWith('classic')
      ? `${r.total.br - classic.total.br >= 0 ? '+' : ''}${fmt(r.total.br - classic.total.br)} (${(((r.total.br - classic.total.br) / classic.total.br) * 100).toFixed(1)} %)`
      : '';
  const boot = r.boot ? `${r.boot.passed}/${r.boot.total}` : 'not run';
  rows.push(
    `| ${r.variant} | ${r.flavor} | ${fmt(r.total.raw)} | ${fmt(r.total.gz)} | ${fmt(r.total.br)} | ${fmt(r.gxt.br)} | ${delta} | ${boot} |`
  );
  if (!r.boot) problems.push(`${r.variant}: not boot-checked (run with --boot)`);
  else if (!r.boot.ok || r.boot.total === 0 || r.boot.passed !== r.boot.total) {
    problems.push(
      `${r.variant}: boot-check ${boot}; first failure ${JSON.stringify(r.boot.firstFailure)}; first page error ${r.boot.firstPageError}`
    );
  }
  for (const v of r.assertNative?.violations ?? []) {
    problems.push(`${r.variant}: --assert-native violation ${v.id} [${v.reason}]`);
  }
}

const verdict = problems.length
  ? [`FAIL: ${problems.length} problem(s)`, ...problems.map((p) => `- ${p}`)]
  : ['OK: every variant boots with all checks passing'];
console.log([...rows, '', ...verdict].join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Modern app from dist: boot JS bytes and boot-checks\n\n${rows.join('\n')}\n\n${verdict.join('\n')}\n`
  );
}
process.exit(problems.length ? 1 : 0);
