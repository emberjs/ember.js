const Plugin = require('broccoli-plugin');
const fs = require('fs');
const path = require('path');

/**
 * Writes a TypeScript file that imports each package. This file can be passed
 * to the TypeScript compiler during testing to verify the types are resolving
 * correctly.
 */
class TypesSmokeTestWriter extends Plugin {
  build() {
    fs.writeFileSync(
      path.join(this.outputPath, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          // Compilation Configuration
          target: 'es2017',
          inlineSources: true,
          inlineSourceMap: true,
          declaration: true,
          declarationMap: true,

          baseUrl: '.',
          rootDir: '.',

          // Environment Configuration
          experimentalDecorators: true,
          moduleResolution: 'node',

          // Enhance Strictness
          strict: true,
          suppressImplicitAnyIndexErrors: false,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noImplicitReturns: true,

          newLine: 'LF',
          noEmit: true,

          paths: {
            '@glimmer/*': ['@glimmer/*/dist/types/index.d.ts'],
          },
        },
        include: ['@glimmer/**/*.ts'],
      })
    );

    // fs.writeFileSync(smokeTestPath, source);
  }
}

module.exports = function(inputPath) {
  return new TypesSmokeTestWriter([inputPath]);
};
