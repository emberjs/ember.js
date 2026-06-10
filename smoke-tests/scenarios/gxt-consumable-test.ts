// Tier-1 acceptance test for the consumable `ember-source-gxt` package
// (design doc docs-internal-gxt-packaging-design.md §5, "Tier 1 — the
// package-consumability gate"). It links the assembled `dist-gxt-package/` in
// place of `ember-source` into the `smoke-tests/v2-app-template` via
// scenario-tester (`linkDevDependency('ember-source', { target })`), prepares
// the app, and asserts the 5 package-consumability properties against the
// prepared app dir — no browser, no full app build.
//
// Prerequisite: `node scripts/build-gxt-package.mjs` must have produced
// `dist-gxt-package/`. The test fails loud (not skips) if it is missing, so a
// green run proves the package was actually assembled and consumed.
//
// Note on assertion 2's resolution form: the design wrote
// `require.resolve('@glimmer/tracking', …)`, but a BARE `@glimmer/tracking` is
// only resolvable by the build tool via the addon's `renamed-modules` map
// (ember-auto-import / Embroider), not by Node's resolver. The package-level
// equivalent — and exactly the target `renamed-modules` points consumers at —
// is `ember-source/@glimmer/tracking/index.js`, resolved through the package's
// `exports` map. We use that form and document it here for honesty.
//
// Note on assertion 5: the design's "a `vite build` reaches and passes the
// classicEmberSupport() prebuild stage" is exercised here as a lightweight,
// node-only proxy of the EXACT code path that crashed (ember-cli-htmlbars@7's
// `findAddonByName('ember-source').absolutePaths.templateCompiler` +
// `require.resolve`). The full `vite build` is the Tier-2 stretch.

import { gxtAppScenarios } from './scenarios';
import type { PreparedApp, Scenarios } from 'scenario-tester';
import * as QUnit from 'qunit';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { createRequire } from 'node:module';

const { module: Qmodule, test } = QUnit;
QUnit.config.testTimeout = 180_000;

// Resolve from arbitrary base dirs (mirrors how a bundler/consumer resolves).
const resolver = createRequire(__filename);
function resolveFrom(spec: string, fromDir: string): string {
  return resolver.resolve(spec, { paths: [fromDir] });
}
function tryResolveFrom(spec: string, fromDir: string): string | null {
  try {
    return resolveFrom(spec, fromDir);
  } catch {
    return null;
  }
}

function gxtConsumableTests(scenarios: Scenarios) {
  scenarios
    .map('gxt-consumable', (_project) => {})
    .forEachScenario((scenario) => {
      Qmodule(scenario.name, function (hooks) {
        let app: PreparedApp;
        let appDir: string;
        let emberSourceDir: string;

        hooks.before(async () => {
          app = await scenario.prepare();
          appDir = app.dir;
          emberSourceDir = join(appDir, 'node_modules', 'ember-source');
        });

        // Assertion 1 — install/prepare succeeds and both packages resolve.
        test('1: ember-source-gxt + @lifeart/gxt resolve from the app', function (assert) {
          const esPkgPath = join(emberSourceDir, 'package.json');
          assert.true(existsSync(esPkgPath), `linked ember-source exists at ${esPkgPath}`);

          const esPkg = JSON.parse(readFileSync(esPkgPath, 'utf8'));
          assert.equal(
            esPkg.name,
            'ember-source-gxt',
            'the linked ember-source IS the GXT-backend package'
          );
          assert.ok(
            esPkg.dependencies && esPkg.dependencies['@lifeart/gxt'],
            '@lifeart/gxt is a declared dependency of the GXT package'
          );

          // @lifeart/gxt must be installed adjacent to ember-source (the GXT dist
          // emits bare `@lifeart/gxt` / `@lifeart/gxt/glimmer-compatibility`
          // imports). scenario-tester nests it under ember-source/node_modules.
          // Its exports are ESM (`import`-only), which is how the dist resolves
          // them; we verify the actual ESM export targets exist on disk.
          const gxtDir = [
            join(emberSourceDir, 'node_modules', '@lifeart', 'gxt'),
            join(appDir, 'node_modules', '@lifeart', 'gxt'),
          ].find((d) => existsSync(join(d, 'package.json')));
          assert.ok(gxtDir, '@lifeart/gxt is installed in the app graph (adjacent to ember-source)');

          if (gxtDir) {
            const gxtExports = JSON.parse(readFileSync(join(gxtDir, 'package.json'), 'utf8')).exports;
            for (const subpath of ['.', './glimmer-compatibility']) {
              const target = gxtExports?.[subpath]?.import;
              assert.ok(target, `@lifeart/gxt exports the "${subpath}" subpath the dist imports`);
              if (target) {
                assert.true(
                  existsSync(join(gxtDir, target)),
                  `@lifeart/gxt "${subpath}" -> ${target} exists on disk`
                );
              }
            }
          }
        });

        // Assertion 2 — @glimmer/tracking resolves INTO the GXT dist and is the
        // GXT shim (re-exports from @lifeart/gxt), not the classic VM.
        test('2: @glimmer/tracking resolves into the GXT dist as the GXT shim', function (assert) {
          const trackingPath = resolveFrom('ember-source/@glimmer/tracking/index.js', appDir);
          assert.ok(
            trackingPath.startsWith(emberSourceDir),
            `@glimmer/tracking resolves into the GXT package dist (${trackingPath})`
          );

          const trackingCode = readFileSync(trackingPath, 'utf8');
          // The shim re-exports from a shared-chunk that imports @lifeart/gxt.
          // Follow the relative shared-chunk import and prove it reaches GXT.
          const chunkMatch = trackingCode.match(/from\s+'(\.\.[^']*shared-chunks[^']+)'/);
          assert.ok(chunkMatch, 'tracking re-exports from a shared-chunk');
          let reachesGxt = trackingCode.includes('@lifeart/gxt');
          if (chunkMatch) {
            const chunkPath = join(dirname(trackingPath), chunkMatch[1]);
            if (existsSync(chunkPath)) {
              reachesGxt = reachesGxt || readFileSync(chunkPath, 'utf8').includes('@lifeart/gxt');
            }
          }
          assert.true(
            reachesGxt,
            'the @glimmer/tracking reactive core comes from @lifeart/gxt (GXT shim, not the classic VM)'
          );

          // And the canonical reactive-core entry is unambiguously the GXT shim.
          const validatorPath = resolveFrom('ember-source/@glimmer/validator/index.js', appDir);
          assert.ok(
            readFileSync(validatorPath, 'utf8').includes('@lifeart/gxt/glimmer-compatibility'),
            '@glimmer/validator is the GXT compatibility shim'
          );
        });

        // Assertion 3 — no @glimmer/runtime VM entry is resolvable (the clean
        // build guarantee from design §1.3 holds end-to-end).
        test('3: no @glimmer/runtime VM entry is resolvable from the GXT package', function (assert) {
          const runtime = tryResolveFrom('ember-source/@glimmer/runtime/index.js', appDir);
          assert.equal(
            runtime,
            null,
            'ember-source/@glimmer/runtime/index.js does NOT resolve (no stale VM shipped)'
          );
          for (const mode of ['dev', 'prod']) {
            const p = join(emberSourceDir, 'dist', mode, 'packages', '@glimmer', 'runtime', 'index.js');
            assert.false(existsSync(p), `no @glimmer/runtime entry file in dist/${mode}`);
          }
        });

        // Assertion 4 — the addon-main exposes a defined, resolvable
        // absolutePaths.templateCompiler (the §5.5 S-item).
        test('4: addon-main exposes a resolvable absolutePaths.templateCompiler', function (assert) {
          const addonMainPath = join(emberSourceDir, 'lib', 'index.js');
          assert.true(existsSync(addonMainPath), 'addon-main lib/index.js exists');

          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const addonMain = createRequire(addonMainPath)(addonMainPath);
          assert.ok(addonMain.absolutePaths, 'addon-main exposes absolutePaths');
          const tc = addonMain.absolutePaths.templateCompiler;
          assert.ok(tc && isAbsolute(tc), `absolutePaths.templateCompiler is an absolute path (${tc})`);
          assert.true(existsSync(tc), 'absolutePaths.templateCompiler points at an existing file');
          assert.ok(
            tryResolveFrom(tc, emberSourceDir),
            'absolutePaths.templateCompiler is require.resolve-able'
          );
        });

        // Assertion 5 — the exact ember-cli-htmlbars@7 path that crashed on the
        // dev checkout (design §1.6) no longer TypeErrors. (Lightweight proxy of
        // "vite build reaches the classicEmberSupport prebuild"; full build =
        // Tier-2.)
        test('5: ember-cli-htmlbars absolutePaths path no longer TypeErrors', function (assert) {
          const addonMainPath = join(emberSourceDir, 'lib', 'index.js');
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const ember = createRequire(addonMainPath)(addonMainPath); // = findAddonByName('ember-source')
          let templateCompilerPath: string | undefined;
          let threw = false;
          try {
            // ember-cli-htmlbars@7 lib/ember-addon-main.js does exactly this:
            templateCompilerPath = ember.absolutePaths.templateCompiler;
          } catch {
            threw = true;
          }
          assert.false(threw, 'reading ember.absolutePaths.templateCompiler does NOT throw');
          assert.ok(templateCompilerPath, 'templateCompiler path is defined (no undefined.templateCompiler)');
          assert.ok(
            templateCompilerPath && tryResolveFrom(templateCompilerPath, emberSourceDir),
            'ember-cli-htmlbars can require.resolve the compilerPath'
          );
        });
      });
    });
}

gxtConsumableTests(gxtAppScenarios);
