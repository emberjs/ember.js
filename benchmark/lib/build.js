/* eslint-disable node/no-unpublished-require */
const rollup = require('rollup');
const sourcemap = require('rollup-plugin-sourcemaps');
const { terser } = require('rollup-plugin-terser');
const path = require('path');
const fs = require('fs-extra');
const symlinkOrCopy = require('symlink-or-copy').sync;

const benchmark = require('./rollup-plugin');

/**
 * @param {string} dist
 * @param {string} out
 */
async function build(dist, out) {
  // create a bundle
  const bundle = await rollup.rollup({
    input: [
      path.resolve(__dirname, '../benchmarks/krausest/browser.js'),
      path.resolve(__dirname, '../benchmarks/krausest/ssr.js'),
    ],
    plugins: [
      benchmark(dist),
      sourcemap(),
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
    onwarn(warning) {
      let { code } = warning;
      if (
        // Suppress known error message caused by TypeScript compiled code with Rollup
        // https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
        code === 'THIS_IS_UNDEFINED' ||
        // Suppress errors regarding un-used exports. These may be left behind
        // after DEBUG stripping and Rollup removed them anyway.
        code === 'UNUSED_EXTERNAL_IMPORT' ||
        code === 'CIRCULAR_DEPENDENCY'
      ) {
        return;
      }
      console.log(`Rollup warning: ${warning.message}`);
    },
  });

  // or write the bundle to disk
  await bundle.write({
    format: 'es',
    dir: path.resolve(out, 'krausest'),
    entryFileNames: '[name].mjs',
    chunkFileNames: '[name].mjs',
    sourcemap: true,
    plugins: [
      {
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'index.html',
            source: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>krausest benchmark</title>
</head>
<script type="module">
import run from './browser.mjs';
run();
</script>
<body>
</body>
</html>
        `,
          });
        },
      },
    ],
  });
}

module.exports = async function buildAll() {
  const experimentDist = path.resolve(__dirname, '../../dist');
  await build(experimentDist, path.resolve(experimentDist, 'benchmarks/experiment'));
  const controlDist = path.resolve(__dirname, '../../control-dist');
  if (fs.existsSync(controlDist)) {
    if (!fs.existsSync(path.join(controlDist, 'node_modules'))) {
      fs.mkdirsSync(path.join(controlDist, 'node_modules'));
      symlinkOrCopy(
        path.join(controlDist, '@glimmer'),
        path.join(controlDist, 'node_modules/@glimmer')
      );
    }
    await build(controlDist, path.resolve(experimentDist, 'benchmarks/control'));
  }
};
