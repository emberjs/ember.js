import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMacros } from '@embroider/macros/babel';
// EXPERIMENTAL: compiles <template>s directly to DOM operations (no wire
// format, no VM). See packages/@glimmer/dom in ember-source.
import { _codegenBabelPlugin } from 'ember-source/ember-template-compiler/index.js';

const macros = buildMacros({});

export default {
  plugins: [
    _codegenBabelPlugin,
    [
      'babel-plugin-ember-template-compilation',
      {
        transforms: [...macros.templateMacros],
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
    ...macros.babelMacros,
  ],

  generatorOpts: {
    compact: false,
  },
};
