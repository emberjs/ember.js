const packages = [
  '@ember/-internals',
  '@ember/application',
  '@ember/array',
  '@ember/canary-features',
  '@ember/component',
  '@ember/controller',
  '@ember/debug',
  '@ember/deprecated-features',
  '@ember/destroyable',
  '@ember/enumerable',
  '@ember/helper',
  '@ember/instrumentation',
  '@ember/modifier',
  '@ember/object',
  '@ember/owner',
  '@ember/renderer',
  '@ember/routing',
  '@ember/runloop',
  '@ember/service',
  '@ember/template',
  '@ember/template-compilation',
  '@ember/template-compiler',
  '@ember/template-factory',
  '@ember/test',
  '@ember/utils',
  '@ember/version',
  '@glimmer/destroyable',
  '@glimmer/encoder',
  '@glimmer/env',
  '@glimmer/global-context',
  '@glimmer/manager',
  '@glimmer/node',
  '@glimmer/opcode-compiler',
  '@glimmer/owner',
  '@glimmer/program',
  '@glimmer/reference',
  '@glimmer/runtime',
  '@glimmer/tracking',
  '@glimmer/util',
  '@glimmer/validator',
  '@glimmer/vm',
  '@glimmer/wire-format',
];
import glob from 'glob';
import nodeGzip from 'node-gzip';

import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { minify } from 'terser';
import { transformSync } from '@babel/core';
import * as brotli from 'brotli';
import { partial } from 'filesize';
const size = partial({ standard: 'jedec' });

const root = join(process.cwd(), 'dist/packages');

let min = {};
let br = {};
let gzip = {};

let packageData = {
  ember: [
    /* pkg, min, gz, br */
  ],
  glimmer: [],
};

function totalMin(dataset) {
  return dataset.reduce((a, b) => a + b[1], 0);
}

function totalGz(dataset) {
  return dataset.reduce((a, b) => a + b[2], 0);
}

function totalBr(dataset) {
  return dataset.reduce((a, b) => a + b[3], 0);
}

import { buildMacros } from '@embroider/macros/babel';

process.env.NODE_ENV = 'production';
process.env.EMBER_ENV = 'production';

const macros = buildMacros();
let babelOptions = {
  cwd: process.cwd(),
  plugins: [...macros.babelMacros],
};

for (const pkg of packages) {
  let jsFiles = glob.sync(`${root}/${pkg}/**/*.js`);

  for (let file of jsFiles) {
    let source = readFileSync(file, 'utf8');
    let transformed = transformSync(source, {
      ...babelOptions,
      filename: file,
    }).code;
    let result = await minify(transformed, {
      module: true,
      mangle: false,
      ecma: 2021,
      compress: {
        ecma: 2021,
        passes: 3,
        defaults: true,
        keep_fargs: false,
        keep_fnames: false,
        /**
         * Required for {{debugger}} to work
         */
        drop_debugger: false,
      },
    });

    let minFileName = file + '.min';
    writeFileSync(minFileName, result.code);

    let compressed = brotli.compress(result.code, {
      mode: 1, // 0 = generic, 1 = text, 2 = font (WOFF2)
      quality: 11, // 0 - 11
      lgwin: 22, // window size
    });

    // console.log(brotli.decompress(brotli.compress(result.code)).length, result.code.length);

    let compressedFileName = minFileName + '.br';
    writeFileSync(compressedFileName, compressed);

    let gzipFileName = minFileName + '.gz';
    let gzipCompressed = (await nodeGzip.gzip(result.code)).toString();
    writeFileSync(gzipFileName, gzipCompressed);

    let minSize = new Blob([result.code]).size;
    let brSize = new Blob([compressed.toString()]).size;
    let gzSize = new Blob([gzipCompressed]).size;

    min[pkg] = min[pkg] || 0;
    min[pkg] += minSize;

    br[pkg] = br[pkg] || 0;
    br[pkg] += brSize;

    gzip[pkg] = gzip[pkg] || 0;
    gzip[pkg] += gzSize;
  }
}

import { table } from 'table';

function printTable(data) {
  // eslint-disable-next-line no-console
  console.info(
    table(data, {
      drawHorizontalLine: (lineIndex, rowCount) => {
        return lineIndex === 0 || lineIndex === 1 || lineIndex === 2 || lineIndex === rowCount;
      },
    })
  );
}

printTable([
  ['', 'Min', 'Gzip', 'Brotli'],
  [
    'Total',
    size(Object.values(min).reduce((a, b) => a + b, 0)),
    size(Object.values(gzip).reduce((a, b) => a + b, 0)),
    size(Object.values(br).reduce((a, b) => a + b, 0)),
  ],
]);

for (const pkg of packages.filter((p) => p.startsWith('@ember'))) {
  let minSize = min[pkg];
  let brSize = br[pkg];
  let gzSize = gzip[pkg];

  packageData.ember.push([pkg, minSize, gzSize, brSize]);
}
for (const pkg of packages.filter((p) => p.startsWith('@glimmer'))) {
  let minSize = min[pkg];
  let brSize = br[pkg];
  let gzSize = gzip[pkg];

  packageData.glimmer.push([pkg, minSize, gzSize, brSize]);
}

printTable([
  ['@ember/*', 'Min', 'Gzip', 'Brotli'],
  [
    'Total',
    size(totalMin(packageData.ember)),
    size(totalGz(packageData.ember)),
    size(totalBr(packageData.ember)),
  ],
  ...packageData.ember.map((x) => [
    x[0].replace('@ember/', ''),
    size(x[1]),
    size(x[2]),
    size(x[3]),
  ]),
]);

printTable([
  ['@glimmer/*', 'Min', 'Gzip', 'Brotli'],
  [
    'Total',
    size(totalMin(packageData.glimmer)),
    size(totalGz(packageData.glimmer)),
    size(totalBr(packageData.glimmer)),
  ],
  ...packageData.glimmer.map((x) => [
    x[0].replace('@glimmer/', ''),
    size(x[1]),
    size(x[2]),
    size(x[3]),
  ]),
]);
