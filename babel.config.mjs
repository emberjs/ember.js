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
  ],
};
