import { defineConfig, configDefaults } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Unit-test config for the GXT backend.
 *
 * Runs, with ONE command, every GXT-backend unit test that can execute in a
 * plain node/jsdom environment:
 *
 *   - `packages/@ember/-internals/gxt-backend/__tests__/**` — pure-function
 *     unit tests of the compat layer (string/regex-free helpers in `utils.ts`).
 *   - `packages/@glimmer/component-gxt/__tests__/**` — the RFC §6 Option-2
 *     reactive-identity test (`@glimmer/component-gxt`).
 *
 * It lives in the `demo` workspace because that is the only package with
 * `vitest` installed. Invoke via the npm script:
 *
 *   cd packages/demo && pnpm test:gxt-unit
 *
 * (equivalently: `./node_modules/.bin/vitest run --config
 * ./vitest.gxt-unit.config.mts`).
 *
 * The `resolve.alias` map mirrors the GXT rollup alias contract
 * (`rollup.config.mjs`): the `@glimmer/component-gxt[/reactive]` entry points
 * and the two `@ember/-internals/gxt-backend/*` shim subpaths resolve to their
 * source files. `@glimmer/validator` is pinned to the CLASSIC workspace
 * package (NOT the gxt-backend shim) so it stands in for the second runtime
 * copy an un-swapped npm `@glimmer/component` would import, letting the
 * identity test observe the symbol-identity fork the sibling package closes.
 * (The `utils.test.ts` suite imports only `../utils`, which has zero
 * dependencies, so the validator pinning is inert for it.)
 *
 * DOCUMENTED SKIP — `compile-template.test.ts` and `compile-utils.test.ts` are
 * excluded below. Both import `../compile`, whose module graph EAGERLY pulls in
 * the entire Ember GXT renderer (manager.ts, gxt-bridge.ts, ember-gxt-wrappers.ts,
 * and transitively the whole classic `@ember/-internals/{glimmer,metal,views}`
 * + `@ember/*` core via bare `@ember/-internals/gxt-backend/gxt-bridge`
 * specifiers). That graph only resolves under the full build/dev-server
 * environment — the rollup `packages()` resolver or `packages/demo/vite.config.mts`
 * (its complete alias map bypasses the `@ember/-internals` package `exports`
 * gate, supplies the GXT compiler + decorator transforms, and provides the
 * build-time global stubs). In a lightweight jsdom config the import either
 * fails to resolve (`Missing "./gxt-backend/gxt-bridge" specifier`) or spends
 * minutes inlining the whole core. This is the same constraint the
 * `@glimmer/manager` shim hits (see identity.test.ts header). These two suites
 * are exercised in the browser via the full dev server, not here.
 */
const repoRoot = resolve(__dirname, '../..');
const gxtBackend = resolve(repoRoot, 'packages/@ember/-internals/gxt-backend');
const componentGxt = resolve(repoRoot, 'packages/@glimmer/component-gxt');

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@glimmer\/component-gxt\/reactive$/,
        replacement: resolve(componentGxt, 'src/reactive.ts'),
      },
      { find: /^@glimmer\/component-gxt$/, replacement: resolve(componentGxt, 'src/index.ts') },
      {
        find: /^@ember\/-internals\/gxt-backend\/validator$/,
        replacement: resolve(gxtBackend, 'validator.ts'),
      },
      {
        find: /^@ember\/-internals\/gxt-backend\/glimmer-tracking$/,
        replacement: resolve(gxtBackend, 'glimmer-tracking.ts'),
      },
      // Classic copy (stands in for the npm @glimmer/component's reactive
      // runtime); deliberately NOT the gxt-backend shim.
      {
        find: /^@glimmer\/validator$/,
        replacement: resolve(repoRoot, 'packages/@glimmer/validator/index.ts'),
      },
    ],
  },
  test: {
    include: [
      resolve(gxtBackend, '__tests__/**/*.test.ts'),
      resolve(componentGxt, '__tests__/**/*.test.ts'),
    ],
    // See DOCUMENTED SKIP in the header: these two suites require the full
    // dev-server/build resolution environment and cannot load standalone.
    exclude: [
      ...configDefaults.exclude,
      '**/gxt-backend/__tests__/compile-template.test.ts',
      '**/gxt-backend/__tests__/compile-utils.test.ts',
    ],
    environment: 'jsdom',
    server: { deps: { inline: [/@lifeart\/gxt/] } },
  },
});
