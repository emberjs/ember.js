/*
  This babel config governs how Ember gets built for publication.
  Features that remain un-transpiled until used by an app are not handled here.

  See babel.test.config.mjs for the extension to this config
  that governs our test suite.
*/

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export default {
  plugins: [
    [
      '@babel/plugin-transform-typescript',
      {
        allowDeclareFields: true,
      },
    ],
    // VITE_STABLE_DECORATORS selects how decorators get compiled:
    //   unset        - babel's legacy decorators, via decorator-transforms.
    //   "typescript" - TypeScript's own emit (see vite.config.mjs), so no
    //                  decorators remain by the time babel sees the code.
    //   anything else - babel's 2023-11 (stage 3) decorators.
    ...(process.env.VITE_STABLE_DECORATORS === 'typescript'
      ? []
      : process.env.VITE_STABLE_DECORATORS
        ? [['@babel/plugin-proposal-decorators', { version: '2023-11' }]]
        : [
            [
              'module:decorator-transforms',
              {
                runEarly: true,
                runtime: { import: 'decorator-transforms/runtime' },
              },
            ],
          ]),
    [
      'babel-plugin-ember-template-compilation',
      {
        compilerPath: resolve(
          dirname(fileURLToPath(import.meta.url)),
          './broccoli/glimmer-template-compiler.mjs'
        ),
      },
    ],
  ],
};
