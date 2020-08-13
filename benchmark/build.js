// eslint-disable-next-line node/no-unpublished-require
const rollup = require('rollup');
// eslint-disable-next-line node/no-unpublished-require
const { terser } = require('rollup-plugin-terser');
const fs = require('fs');
const path = require('path');

async function build() {
  // create a bundle
  const bundle = await rollup.rollup({
    input: 'benchmark/krausest/index.js',
    plugins: [
      {
        resolveId(id) {
          if (id === '@glimmer/env') {
            return '\0@glimmer/env';
          }
          if (id.startsWith('@glimmer')) {
            return path.resolve(__dirname, `../dist/${id}/dist/modules/es2017/index.js`);
          }
          return undefined;
        },
        load(id) {
          if (id === '\0@glimmer/env') {
            return `export const DEBUG = false;`;
          }
          /** @type {string | undefined} */
          let result;
          if (id.endsWith('.hbs')) {
            const source = fs.readFileSync(id, 'utf8');
            // eslint-disable-next-line node/no-unpublished-require
            const compiled = require('../dist/@glimmer/compiler').precompile(source);
            result = `export default ${compiled};`;
          }
          return result;
        },
      },
      terser({
        compress: {
          // eslint-disable-next-line @typescript-eslint/camelcase
          negate_iife: false,
          sequences: 0,
        },
        output: {
          semicolons: false,
        },
      }),
    ],
  });

  // or write the bundle to disk
  await bundle.write({
    format: 'iife',
    file: 'dist/benchmark/krauset.js',
    sourcemap: true,
  });
}

build();
