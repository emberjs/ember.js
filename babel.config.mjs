/*
  This babel config governs how Ember gets built for publication. Features that
  remain un-transpiled until used by an app are not handled here.

  See babel.test.config.mjs for the extension to this config that governs our
  test suite.
*/

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Deliberately keyed off GXT_MODE *alone*, NOT the shared `isGxtEnabled()`
// helper (scripts/gxt-alias-map.mjs). Under the Vite/GXT test harness
// (GXT_MODE=true) the @lifeart/gxt compiler owns template compilation, so the
// classic `babel-plugin-ember-template-compilation` below is skipped. The Rollup
// `EMBER_RENDER_BACKEND=gxt` publish build, by contrast, intentionally keeps the
// classic precompile pass — so this must not also flip on EMBER_RENDER_BACKEND.
// See gxt-alias-map.mjs `isGxtEnabled` for the full asymmetry rationale.
const useGxt = process.env.GXT_MODE === 'true';

export default {
  plugins: [
    [
      '@babel/plugin-transform-typescript',
      {
        allowDeclareFields: true,
      },
    ],
    [
      'module:decorator-transforms',
      {
        runEarly: true,
        runtime: { import: 'decorator-transforms/runtime' },
      },
    ],
    // In GXT mode, template compilation is handled by Vite via the gxt compiler
    // or templateTag plugin. In classic mode, we must pre-compile
    // `precompileTemplate` calls here so they don't survive into the runtime
    // bundle (which would throw at module evaluation time).
    ...(useGxt
      ? []
      : [
          [
            'babel-plugin-ember-template-compilation',
            {
              compilerPath: resolve(
                dirname(fileURLToPath(import.meta.url)),
                './broccoli/glimmer-template-compiler.mjs'
              ),
            },
          ],
        ]),
  ],
};
