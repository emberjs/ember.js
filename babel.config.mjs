/*
  This babel config governs how Ember gets built for publication. Features that
  remain un-transpiled until used by an app are not handled here.

  See babel.test.config.mjs for the extension to this config that governs our
  test suite.
*/

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
