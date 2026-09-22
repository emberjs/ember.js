import { Project, Scenarios } from 'scenario-tester';
import type { PreparedApp } from 'scenario-tester';
import { dirname, join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

// Runtime strings inside shaken branches — present in a normal build, gone
// from a shaken one.
const MARKERS = ['The `Comparable` mixin is deprecated', '`PromiseProxyMixin` is deprecated'];

function distContains(appDir: string, text: string): boolean {
  let queue = [join(appDir, 'dist')];
  while (queue.length > 0) {
    let dir = queue.pop()!;
    for (let entry of readdirSync(dir, { withFileTypes: true })) {
      let full = join(dir, entry.name);
      if (entry.isDirectory()) {
        queue.push(full);
      } else if (entry.name.endsWith('.js') && readFileSync(full, 'utf8').includes(text)) {
        return true;
      }
    }
  }
  return false;
}

Scenarios.fromProject(() =>
  Project.fromDir(dirname(require.resolve('../v2-app-template/package.json')), {
    linkDevDeps: true,
  })
)
  .map('deprecation-shaking', (project) => {
    project.mergeFiles({
      // The plugin is applied only when SHAKE=1 so the same app can build
      // both ways.
      'vite.config.mjs': `
        import { defineConfig } from 'vite';
        import { extensions, classicEmberSupport, ember } from '@embroider/vite';
        import { babel } from '@rollup/plugin-babel';
        import { deprecationShaking } from 'ember-source/deprecation-shaking';

        export default defineConfig({
          // the app template has no terser; rollup's DCE is what shaking
          // relies on, so minification is irrelevant here
          build: { minify: false },
          plugins: [
            classicEmberSupport(),
            ember(),
            ...(process.env.SHAKE
              ? [
                  deprecationShaking({
                    strip: [
                      'deprecate-comparable-mixin',
                      'importing-inject-from-ember-service',
                      'deprecate-object-proxy',
                      'deprecate-promise-proxy-mixin',
                    ],
                  }),
                ]
              : []),
            babel({
              babelHelpers: 'runtime',
              extensions,
            }),
          ],
        });
      `,
      tests: {
        integration: {
          'deprecation-shaking-test.js': `
            import { module, test } from 'qunit';
            import Comparable from '@ember/-internals/runtime/lib/mixins/comparable';
            import { DEPRECATIONS } from '@ember/-internals/deprecations';
            import {
              DEPRECATE_COMPARABLE_MIXIN,
              DEPRECATE_OBJECT_PROXY,
              DEPRECATE_PROMISE_PROXY_MIXIN,
            } from '@ember/deprecated-features';
            import { inject } from '@ember/service';
            import ObjectProxy from '@ember/object/proxy';
            import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';

            module('deprecation shaking', function () {
              // Passes in both the shaken and unshaken build: the runtime
              // must agree with the flag either way.
              test('flag state is consistent with runtime behavior', function (assert) {
                if (DEPRECATE_COMPARABLE_MIXIN) {
                  assert.true(Boolean(Comparable), 'Comparable mixin exists while the flag is on');
                  // no isRemoved assertion here: version simulation
                  // (_OVERRIDE_DEPRECATION_VERSION) can legitimately make an
                  // unshaken deprecation report removed
                } else {
                  assert.strictEqual(Comparable, undefined, 'Comparable mixin is shaken away');
                  assert.true(
                    DEPRECATIONS.DEPRECATE_COMPARABLE_MIXIN.isRemoved,
                    'reports removed when the flag is off'
                  );
                }
              });

              test('proxy flags are consistent with runtime behavior', function (assert) {
                if (DEPRECATE_PROMISE_PROXY_MIXIN) {
                  assert.true(Boolean(PromiseProxyMixin), 'PromiseProxyMixin exists while the flag is on');
                } else {
                  assert.strictEqual(PromiseProxyMixin, undefined, 'PromiseProxyMixin is shaken away');
                }

                if (!DEPRECATE_OBJECT_PROXY) {
                  assert.throws(
                    () => ObjectProxy.create({ content: {} }),
                    /was removed in ember-source/,
                    'the ObjectProxy stub throws the removal error'
                  );
                } else {
                  assert.true(typeof ObjectProxy === 'function', 'ObjectProxy exists while the flag is on');
                }
              });

              test('an API past its until version throws the removal error', function (assert) {
                assert.throws(() => inject('foo'), /was removed in ember-source/);
              });
            });
          `,
        },
      },
    });
  })
  .forEachScenario((scenario) => {
    Qmodule(scenario.name, function (hooks) {
      let app: PreparedApp;
      hooks.before(async () => {
        app = await scenario.prepare();
      });

      // Control: without the plugin the deprecated code ships (also proves
      // the MARKERS stay valid probes).
      test('unshaken build contains the deprecated code and tests pass', async function (assert) {
        let result = await app.execute('pnpm test');
        assert.equal(result.exitCode, 0, result.output);
        for (let marker of MARKERS) {
          assert.true(distContains(app.dir, marker), `marker present in unshaken build: ${marker}`);
        }
      });

      test('shaken build drops the deprecated code and tests pass', async function (assert) {
        let result = await app.execute('pnpm test', { env: { SHAKE: '1' } });
        assert.equal(result.exitCode, 0, result.output);
        for (let marker of MARKERS) {
          assert.false(distContains(app.dir, marker), `marker absent from shaken build: ${marker}`);
        }
      });

      test('shaken production build also drops the deprecated code', async function (assert) {
        let result = await app.execute('pnpm build', { env: { SHAKE: '1' } });
        assert.equal(result.exitCode, 0, result.output);
        for (let marker of MARKERS) {
          assert.false(
            distContains(app.dir, marker),
            `marker absent from shaken prod build: ${marker}`
          );
        }
      });
    });
  });
