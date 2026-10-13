#!/usr/bin/env node
// scripts/gxt-check.mjs — opt-in type-check and lint report for the GXT
// backend (packages/@ember/-internals/gxt-backend), which the root
// `pnpm type-check` and `pnpm lint` exclude.
//
//   node scripts/gxt-check.mjs [--verbose]
//
// Runs tsc with tsconfig/gxt-backend.json (compat) and tsconfig/gxt-native.json
// (native), and eslint with the rules below at "warn". Prints the diagnostic
// counts and always exits 0: the counts are a baseline to drive down, not a
// gate yet.
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GXT_BACKEND = 'packages/@ember/-internals/gxt-backend';
const verbose = process.argv.includes('--verbose');

function areaOf(file) {
  if (file.startsWith(`${GXT_BACKEND}/native/`)) return 'native';
  if (file.startsWith(`${GXT_BACKEND}/`)) return 'compat';
  return 'other';
}

function countBy(items, key) {
  const counts = new Map();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]);
}

function typeCheck(project) {
  const result = spawnSync(
    join(ROOT, 'node_modules/.bin/tsc'),
    ['--project', project, '--pretty', 'false'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }
  );
  const diagnostics = [];
  for (const line of `${result.stdout}${result.stderr}`.split('\n')) {
    const match = /^(.+?)\(\d+,\d+\): error (TS\d+):/.exec(line);
    if (match) diagnostics.push({ file: match[1], code: match[2], text: line });
  }
  return diagnostics;
}

const eslintConfig = [
  {
    files: [`${GXT_BACKEND}/**/*.ts`, `${GXT_BACKEND}/**/*.js`, `${GXT_BACKEND}/**/*.mjs`],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    // The sources carry disable directives for rules this config does not load.
    linterOptions: { noInlineConfig: true },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      'no-empty': 'warn',
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'CatchClause > BlockStatement[body.length=0]',
          message: 'catch block without statements (empty or comment-only)',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },
];

async function lint() {
  const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: true, overrideConfig: eslintConfig });
  const results = await eslint.lintFiles([GXT_BACKEND]);
  const messages = [];
  for (const result of results) {
    const file = relative(ROOT, result.filePath);
    for (const message of result.messages) {
      // Rule-less non-fatal messages are the "directive has no effect" notes
      // that `noInlineConfig` produces.
      if (message.ruleId === null && !message.fatal) continue;
      const rule = message.ruleId ?? 'parse-error';
      messages.push({ file, rule, text: `${file}:${message.line} ${rule}: ${message.message}` });
    }
  }
  return messages;
}

function report(title, items, key) {
  console.log(`\n${title}: ${items.length}`);
  for (const area of ['compat', 'native', 'other']) {
    const inArea = items.filter((item) => areaOf(item.file) === area);
    if (inArea.length === 0) continue;
    const detail = countBy(inArea, key)
      .map(([name, count]) => `${name} ${count}`)
      .join(', ');
    console.log(`  ${area}: ${inArea.length} (${detail})`);
  }
  if (verbose) for (const item of items) console.log(`    ${item.text}`);
}

const compat = typeCheck('tsconfig/gxt-backend.json');
const native = typeCheck('tsconfig/gxt-native.json');
report('tsc tsconfig/gxt-backend.json', compat, (d) => d.code);
report('tsc tsconfig/gxt-native.json', native, (d) => d.code);
report('eslint (warn-only rules)', await lint(), (m) => m.rule);
