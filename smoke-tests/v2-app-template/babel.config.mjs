import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  babelCompatSupport,
  templateCompatSupport,
} from '@embroider/compat/babel';
// EXPERIMENTAL: compiles <template>s directly to DOM operations (no wire
// format, no VM). `vmInterop` lets the router render compiled templates.
// See packages/@glimmer/dom in ember-source.
import { _codegenBabelPlugin } from 'ember-source/ember-template-compiler/index.js';

export default {
  plugins: [
    // must come before babel-plugin-ember-template-compilation
    [_codegenBabelPlugin, { vmInterop: true }],
    [
      'babel-plugin-ember-template-compilation',
      {
        enableLegacyModules: [
          'ember-cli-htmlbars',
          'ember-cli-htmlbars-inline-precompile',
          'htmlbars-inline-precompile',
        ],
        transforms: [...templateCompatSupport()],
      },
    ],
    [
      'module:decorator-transforms',
      {
        runtime: {
          import: fileURLToPath(
            import.meta.resolve('decorator-transforms/runtime-esm'),
          ),
        },
      },
    ],
    [
      '@babel/plugin-transform-runtime',
      {
        absoluteRuntime: dirname(fileURLToPath(import.meta.url)),
        useESModules: true,
        regenerator: false,
      },
    ],
    ...babelCompatSupport(),
  ],

  generatorOpts: {
    compact: false,
  },
};
