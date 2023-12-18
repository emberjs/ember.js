import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vmBabelPlugins from '@glimmer/vm-babel-plugins';

const require = createRequire(import.meta.url);
const buildDebugMacroPlugin = require('./lib/build-debug-macro-plugin.js');
const isProduction = process.env.EMBER_ENV === 'production';

export default {
  plugins: [
    [
      '@babel/plugin-transform-typescript',
      {
        allowDeclareFields: true,
      },
    ],
    ['module:decorator-transforms', { runtime: { import: 'decorator-transforms/runtime' } }],
    [
      'babel-plugin-ember-template-compilation',
      {
        compilerPath: resolve(
          dirname(fileURLToPath(import.meta.url)),
          './broccoli/glimmer-template-compiler'
        ),
      },
    ],
    buildDebugMacroPlugin(!isProduction),
    ...vmBabelPlugins({ isDebug: !isProduction }),
  ],
};
