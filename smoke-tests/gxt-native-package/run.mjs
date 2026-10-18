#!/usr/bin/env node
// Acceptance check of the PACKED gxt-native Ember package from a fresh consumer
// app OUTSIDE the ember repo (so nothing can resolve through the repo's
// node_modules): install the tarballs, build in production, boot it, measure
// it, prove one @glimmer/component copy, and (with --dev) boot the vite dev
// server.
//
//   node scripts/build-gxt-native-package.mjs --pack <tarballs>
//   (cd <glimmer-next> && npm pack --ignore-scripts --pack-destination <tarballs>)
//   node smoke-tests/gxt-native-package/run.mjs --app <dir outside the repo> \
//     --package <tarballs>/ember-source-gxt-native-<v>.tgz \
//     --gxt <tarballs>/lifeart-gxt-<v>.tgz [--dev] [--no-install]
//     [--no-typescript]
//     [--compare-bundle smoke-tests/modern-app/dist/gxt-native-dist]
//
// --no-typescript: the consumer does not list `typescript` (a gxt whose
// compiler declares it as an optional peer and loads it lazily needs no
// typescript in the app); the install checks then also require that no
// typescript was installed.
//
// The app is the modern reference app (smoke-tests/modern-app/app, strict
// .gjs) with this directory's consumer/ files (vite.config.mjs = the package's
// preset + the user's babel). `ember-source` is installed from the package
// tarball under the `ember-source` name (as an `npm:` alias would), and an
// `overrides` entry pins every @lifeart/gxt to the gxt tarball (the gxt the
// package needs is not on npm yet). Exit 0 = every check passed.
import { spawn, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const EMBER_ROOT = resolve(HERE, '../..');
const MODERN_APP = join(EMBER_ROOT, 'smoke-tests/modern-app');

const argv = process.argv.slice(2);
const opt = (name, dflt = null) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const flag = (name) => argv.includes(name);
const APP = opt('--app') && resolve(opt('--app'));
const PACKAGE_TGZ = opt('--package') && resolve(opt('--package'));
const GXT_TGZ = opt('--gxt') && resolve(opt('--gxt'));
const COMPARE = resolve(
  EMBER_ROOT,
  opt('--compare-bundle', 'smoke-tests/modern-app/dist/gxt-native-dist')
);
const INSTALL = !flag('--no-install');
const WITH_TYPESCRIPT = !flag('--no-typescript');

const log = (msg) => process.stdout.write(`[gxt-native-consumer] ${msg}\n`);
const checks = [];
const timings = {};
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}
function die(msg) {
  process.stderr.write(`[gxt-native-consumer] ERROR: ${msg}\n`);
  process.exit(2);
}

function run(cmd, args, { cwd = APP, env = {}, timeoutSec = 600, logName }) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: timeoutSec * 1000,
    maxBuffer: 256 << 20,
  });
  const logFile = join(APP, `${logName}.log`);
  writeFileSync(logFile, `$ ${cmd} ${args.join(' ')}\n${r.stdout ?? ''}\n${r.stderr ?? ''}`);
  timings[logName] = Number(((Date.now() - t0) / 1000).toFixed(1));
  log(`${logName}: exit ${r.status ?? r.signal} in ${timings[logName]}s (log ${logFile})`);
  if (r.error || r.status !== 0) die(`${cmd} ${args.join(' ')} failed; see ${logFile}`);
  return r.stdout;
}

// The version of `name` installed for `fromDir` (relative to the ember repo).
function repoVersion(name, fromDir = '.') {
  let dir = realpathSync(join(EMBER_ROOT, fromDir));
  for (;;) {
    const candidate = join(dir, 'node_modules', name, 'package.json');
    if (existsSync(candidate)) return JSON.parse(readFileSync(candidate, 'utf8')).version;
    if (dir === dirname(dir)) die(`cannot find ${name} from ${fromDir}`);
    dir = dirname(dir);
  }
}

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    const dst = join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else copyFileSync(src, dst);
  }
}

// ---------------------------------------------------------------- materialize
if (!APP) die('--app <dir> is required');
mkdirSync(APP, { recursive: true });
if (realpathSync(APP).startsWith(realpathSync(EMBER_ROOT) + '/')) {
  die(`--app must be OUTSIDE the ember repo (${EMBER_ROOT})`);
}
for (const entry of ['app', 'dist', 'dist-addon-check', 'vendor']) {
  rmSync(join(APP, entry), { recursive: true, force: true });
}
copyDir(join(MODERN_APP, 'app'), join(APP, 'app'));
copyFileSync(join(MODERN_APP, 'index.html'), join(APP, 'index.html'));
for (const f of readdirSync(join(HERE, 'consumer'))) {
  copyFileSync(join(HERE, 'consumer', f), join(APP, f));
}

if (INSTALL) {
  if (!PACKAGE_TGZ || !GXT_TGZ) die('--package <tgz> and --gxt <tgz> are required to install');
  mkdirSync(join(APP, 'vendor'), { recursive: true });
  copyFileSync(PACKAGE_TGZ, join(APP, 'vendor', basename(PACKAGE_TGZ)));
  copyFileSync(GXT_TGZ, join(APP, 'vendor', basename(GXT_TGZ)));
  const addonOut = run('npm', ['pack', '--json', '--pack-destination', join(APP, 'vendor')], {
    cwd: join(HERE, 'local-glimmer-addon'),
    logName: 'pack-local-addon',
    timeoutSec: 60,
  });
  const [addon] = JSON.parse(addonOut);
  // Toolchain versions = the ones the ember repo's from-dist harness builds
  // with, so the bundle bytes compare (a newer rollup alone moves the bundle:
  // 4.64.5 vs 4.61.0 = +143 B raw / -10 B brotli through different constant
  // folding of one gxt flag).
  const pkg = {
    name: 'gxt-native-consumer',
    private: true,
    type: 'module',
    scripts: { build: 'vite build', dev: 'vite' },
    dependencies: {
      'ember-source': `file:vendor/${basename(PACKAGE_TGZ)}`,
      '@lifeart/gxt': `file:vendor/${basename(GXT_TGZ)}`,
      'decorator-transforms': repoVersion('decorator-transforms'),
      'ember-strict-application-resolver': repoVersion(
        'ember-strict-application-resolver',
        'smoke-tests/v2-app-gxt-template'
      ),
      'local-glimmer-addon': `file:vendor/${addon.filename}`,
    },
    devDependencies: {
      '@babel/core': repoVersion('@babel/core'),
      '@babel/preset-env': repoVersion('@babel/preset-env'),
      // types only: the preset resolves @glimmer/component to the package's copy
      '@glimmer/component': '2.1.1',
      '@rollup/plugin-babel': repoVersion('@rollup/plugin-babel'),
      terser: repoVersion('terser'),
      // @lifeart/gxt <= 0.0.81 (incl. the published 0.0.81) statically imports
      // `typescript` from @lifeart/gxt/compiler without declaring it — with
      // such a gxt the app must provide it. --no-typescript leaves it out.
      ...(WITH_TYPESCRIPT ? { typescript: repoVersion('typescript') } : {}),
      vite: repoVersion('vite'),
    },
    overrides: {
      // The gxt the package needs is not released yet: every @lifeart/gxt in
      // the tree comes from the gxt tarball.
      '@lifeart/gxt': '$@lifeart/gxt',
      rollup: repoVersion('rollup', 'node_modules/vite'),
    },
  };
  writeFileSync(join(APP, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  rmSync(join(APP, 'node_modules'), { recursive: true, force: true });
  rmSync(join(APP, 'package-lock.json'), { force: true });
  run('npm', ['install', '--no-audit', '--no-fund'], { logName: 'npm-install', timeoutSec: 900 });
}

// ---------------------------------------------------------------- install checks
const nm = join(APP, 'node_modules');
const installed = JSON.parse(readFileSync(join(nm, 'ember-source', 'package.json'), 'utf8'));
check(
  'install: the package is installed as `ember-source`',
  installed.name === 'ember-source-gxt-native',
  `${installed.name}@${installed.version} (gxt pin ${installed.dependencies['@lifeart/gxt']})`
);
const gxtCopies = findPackages(nm, '@lifeart/gxt');
check(
  'install: one @lifeart/gxt in node_modules, from the gxt tarball',
  gxtCopies.length === 1 && existsSync(join(gxtCopies[0], 'dist', 'gxt.index.es.js')),
  gxtCopies.map((d) => relative(APP, d)).join(', ')
);
const glimmerComponentCopies = findPackages(nm, '@glimmer/component').map((d) => {
  const { version } = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
  return `${relative(APP, d)}@${version}`;
});
log(
  `installed @glimmer/component copies (none may reach the bundle): ${glimmerComponentCopies.join(', ')}`
);

// Every package in node_modules (nested copies included), and its size on disk.
const installedPackages = listPackages(nm);
writeFileSync(
  join(APP, 'installed-packages.txt'),
  installedPackages.map((p) => `${p.name}@${p.version}  ${relative(APP, p.dir)}`).join('\n') + '\n'
);
const du = spawnSync('du', ['-sk', nm], { encoding: 'utf8' });
const nodeModulesKB = du.status === 0 ? Number(du.stdout.split(/\s/)[0]) : null;
log(
  `node_modules: ${installedPackages.length} packages, ${nodeModulesKB === null ? '? (du failed)' : `${(nodeModulesKB / 1024).toFixed(1)} MB`}` +
    `${timings['npm-install'] === undefined ? '' : `, npm install ${timings['npm-install']}s`} (list ${join(APP, 'installed-packages.txt')})`
);
// gxt's renderer demos (three / jspdf / yoga-layout) are not reachable from any
// published gxt entry: a consumer must not install them.
const HEAVY = ['three', '@types/three', 'jspdf', 'yoga-layout'];
const heavy = installedPackages.filter((p) => HEAVY.includes(p.name));
check(
  `install: no ${HEAVY.join(' / ')} (unused by every published gxt entry)`,
  heavy.length === 0,
  heavy.map((p) => `${p.name}@${p.version}`).join(', ') || 'none installed'
);
if (!WITH_TYPESCRIPT) {
  const typescript = installedPackages.filter((p) => p.name === 'typescript');
  check(
    'install: no typescript anywhere in node_modules (--no-typescript)',
    typescript.length === 0,
    typescript.map((p) => `${relative(APP, p.dir)}@${p.version}`).join(', ') || 'none installed'
  );
}

function listPackages(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const pkgDirs = entry.name.startsWith('@')
      ? readdirSync(join(dir, entry.name), { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => join(dir, entry.name, e.name))
      : [join(dir, entry.name)];
    for (const pkgDir of pkgDirs) {
      const manifest = join(pkgDir, 'package.json');
      if (existsSync(manifest)) {
        const { name, version } = JSON.parse(readFileSync(manifest, 'utf8'));
        acc.push({ name, version, dir: pkgDir });
      }
      listPackages(join(pkgDir, 'node_modules'), acc);
    }
  }
  return acc;
}

function findPackages(dir, name, acc = []) {
  if (!existsSync(dir)) return acc;
  const direct = join(dir, name);
  if (existsSync(join(direct, 'package.json'))) acc.push(direct);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '.bin' || entry.name === '.vite') continue;
    const scopes = entry.name.startsWith('@')
      ? readdirSync(join(dir, entry.name)).map((n) => join(dir, entry.name, n))
      : [join(dir, entry.name)];
    for (const pkgDir of scopes) findPackages(join(pkgDir, 'node_modules'), name, acc);
  }
  return acc;
}

// ---------------------------------------------------------------- production build
const VITE = join(nm, '.bin', 'vite');
run(VITE, ['build'], { logName: 'vite-build-prod' });

function bootSet(outDir, htmlKey) {
  const manifest = JSON.parse(readFileSync(join(outDir, '.vite', 'manifest.json'), 'utf8'));
  const files = new Set();
  const visit = (key) => {
    const chunk = manifest[key];
    if (!chunk || files.has(chunk.file)) return;
    files.add(chunk.file);
    for (const dep of chunk.imports ?? []) visit(dep);
  };
  visit(htmlKey);
  return [...files];
}
function sourcesOf(outDir, files) {
  const sources = [];
  for (const f of files) {
    const map = JSON.parse(readFileSync(join(outDir, `${f}.map`), 'utf8'));
    for (const s of map.sources) sources.push(resolve(dirname(join(outDir, f)), s));
  }
  return sources;
}

const distDir = join(APP, 'dist');
const boot = bootSet(distDir, 'index.html');
const total = { raw: 0, gz: 0, br: 0 };
for (const f of boot) {
  const buf = readFileSync(join(distDir, f));
  total.raw += buf.byteLength;
  total.gz += gzipSync(buf).byteLength;
  total.br += brotliCompressSync(buf).byteLength;
}
log(`boot JS (${boot.join(', ')}): raw ${total.raw} / gzip ${total.gz} / brotli ${total.br}`);

const pkgDir = realpathSync(join(nm, 'ember-source'));
const sources = sourcesOf(distDir, boot).map((s) => {
  try {
    return realpathSync(s);
  } catch (error) {
    if (error.code === 'ENOENT') return s; // virtual / helper modules
    throw error;
  }
});
const inPkg = (sub) => sources.filter((s) => s.startsWith(join(pkgDir, sub) + '/'));
const emberProd = inPkg('dist/prod');
const emberDev = inPkg('dist/dev');
const glimmerComponent = sources.filter((s) => /glimmer-component|@glimmer\/component/.test(s));
const gxtSources = sources.filter((s) => s.includes('/@lifeart/gxt/'));
const outside = sources.filter(
  (s) =>
    !s.startsWith(pkgDir + '/') &&
    !s.includes('/@lifeart/gxt/') &&
    !s.startsWith(join(APP, 'app') + '/') &&
    !s.includes('/node_modules/decorator-transforms/') &&
    !s.includes('/node_modules/ember-strict-application-resolver/')
);
check(
  'prod bundle: Ember comes from the package dist/prod only',
  emberProd.length > 0 && emberDev.length === 0,
  `${emberProd.length} dist/prod files, ${emberDev.length} dist/dev`
);
check(
  'prod bundle: exactly one @glimmer/component (the package copy)',
  glimmerComponent.length === 1 &&
    glimmerComponent[0].startsWith(join(pkgDir, 'dist/glimmer-component')),
  glimmerComponent.map((s) => relative(APP, s)).join(', ')
);
check(
  'prod bundle: gxt from the one installed copy',
  gxtSources.length > 0 && gxtSources.every((s) => s.startsWith(gxtCopies[0] + '/')),
  `${gxtSources.length} gxt modules`
);
check('prod bundle: nothing else bundled', outside.length === 0, outside.slice(0, 5).join(', '));

if (existsSync(COMPARE)) {
  const theirs = readdirSync(join(COMPARE, 'assets')).filter((f) => f.endsWith('.js'));
  const mine = boot.map((f) => basename(f));
  const identical =
    theirs.length === mine.length &&
    mine.every((f) => {
      const other = join(COMPARE, 'assets', f);
      return (
        existsSync(other) && readFileSync(other).equals(readFileSync(join(distDir, 'assets', f)))
      );
    });
  const theirBr = theirs.reduce(
    (sum, f) => sum + brotliCompressSync(readFileSync(join(COMPARE, 'assets', f))).byteLength,
    0
  );
  log(
    `from-dist harness bundle (${relative(EMBER_ROOT, COMPARE)}): ${theirs.join(', ')} brotli ${theirBr}; consumer ${total.br} (${total.br - theirBr >= 0 ? '+' : ''}${total.br - theirBr}); byte-identical: ${identical}`
  );
  check(
    'prod bundle: byte-identical to the from-dist measurement',
    identical,
    `${mine.join(', ')} vs ${theirs.join(', ')}`
  );
}

const bootOut = join(APP, 'boot-prod.json');
spawnSync(process.execPath, [join(MODERN_APP, 'boot-check.mjs'), distDir, '--json', bootOut], {
  stdio: 'inherit',
  timeout: 180_000,
});
const prodBoot = existsSync(bootOut) ? JSON.parse(readFileSync(bootOut, 'utf8')) : null;
check(
  'prod boot-check',
  prodBoot !== null && prodBoot.total > 0 && prodBoot.passed === prodBoot.total,
  prodBoot ? `${prodBoot.passed}/${prodBoot.total}` : 'no result'
);

// ---------------------------------------------------------------- addon @glimmer/component identity
run(VITE, ['build'], {
  logName: 'vite-build-addon-check',
  env: { CONSUMER_INPUT: 'addon-check.html', CONSUMER_OUT_DIR: 'dist-addon-check' },
});
const addonDist = join(APP, 'dist-addon-check');
const addonSources = sourcesOf(addonDist, bootSet(addonDist, 'addon-check.html'));
const addonGc = addonSources.filter((s) => /glimmer-component|@glimmer\/component/.test(s));
check(
  'addon build: app + an addon depending on @glimmer/component 2.0.0 share one copy',
  addonGc.length === 1 && addonSources.some((s) => s.includes('local-glimmer-addon')),
  addonGc.map((s) => relative(APP, s)).join(', ')
);

// ---------------------------------------------------------------- dev server
if (flag('--dev')) {
  const port = await new Promise((done) => {
    const srv = createServer().listen(0, '127.0.0.1', () => {
      const { port: p } = srv.address();
      srv.close(() => done(p));
    });
  });
  const devLog = join(APP, 'vite-dev.log');
  const server = spawn(VITE, ['--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: APP,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', (d) => (output += d));
  server.stderr.on('data', (d) => (output += d));
  const killTimer = setTimeout(() => server.kill('SIGKILL'), 240_000);
  try {
    const url = `http://127.0.0.1:${port}/`;
    const deadline = Date.now() + 60_000;
    let up = false;
    while (!up && Date.now() < deadline) {
      try {
        up = (await fetch(url)).ok;
      } catch (error) {
        if (error.cause?.code !== 'ECONNREFUSED') throw error;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (!up) die(`vite dev server did not come up on ${url}; see ${devLog}`);
    const devOut = join(APP, 'boot-dev.json');
    spawnSync(
      process.execPath,
      [join(MODERN_APP, 'boot-check.mjs'), '--url', url, '--json', devOut],
      {
        stdio: 'inherit',
        timeout: 180_000,
      }
    );
    const devBoot = existsSync(devOut) ? JSON.parse(readFileSync(devOut, 'utf8')) : null;
    check(
      'dev server boot-check',
      devBoot !== null && devBoot.total > 0 && devBoot.passed === devBoot.total,
      devBoot ? `${devBoot.passed}/${devBoot.total}` : 'no result'
    );
    const scripts = devBoot?.scripts ?? [];
    const urlsByPath = new Map();
    for (const u of scripts) {
      const path = new URL(u).pathname;
      urlsByPath.set(path, new Set([...(urlsByPath.get(path) ?? []), u]));
    }
    const twice = [...urlsByPath].filter(([, urls]) => urls.size > 1).map(([path]) => path);
    check(
      'dev server: no module instantiated twice (one URL per file)',
      scripts.length > 0 && twice.length === 0,
      `${urlsByPath.size} modules${twice.length ? `; twice: ${twice.slice(0, 3).join(', ')}` : ''}`
    );
    const devEmber = scripts.filter((u) => u.includes('/ember-source/dist/dev/'));
    const prodEmber = scripts.filter((u) => u.includes('/ember-source/dist/prod/'));
    check(
      'dev server: Ember served from the package dist/dev (development condition)',
      devEmber.length > 0 && prodEmber.length === 0,
      `${devEmber.length} dist/dev modules, ${prodEmber.length} dist/prod`
    );
    const metaFile = join(nm, '.vite', 'deps', '_metadata.json');
    const optimized = existsSync(metaFile)
      ? Object.keys(JSON.parse(readFileSync(metaFile, 'utf8')).optimized ?? {})
      : [];
    check(
      'dev server: Ember / gxt / @glimmer/component not pre-bundled (one copy of each)',
      !optimized.some((d) => /^(@ember\/|@glimmer\/|@lifeart\/gxt|ember-source)/.test(d)),
      `pre-bundled: ${optimized.join(', ') || '(none)'}`
    );
  } finally {
    clearTimeout(killTimer);
    server.kill('SIGTERM');
    await new Promise((r) => {
      if (server.exitCode !== null) r();
      else server.once('exit', r);
    });
    writeFileSync(devLog, output);
  }
}

const failed = checks.filter((c) => !c.ok);
writeFileSync(
  join(APP, 'acceptance.json'),
  JSON.stringify(
    {
      package: installed.name,
      version: installed.version,
      install: {
        withTypescript: WITH_TYPESCRIPT,
        packages: installedPackages.length,
        nodeModulesKB,
        npmInstallSec: timings['npm-install'] ?? null,
      },
      total,
      boot,
      checks,
    },
    null,
    2
  )
);
log(`${checks.length - failed.length}/${checks.length} acceptance checks passed`);
process.exit(failed.length ? 1 : 0);
