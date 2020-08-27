'use strict';

const fs = require('fs-extra');
const symlinkOrCopy = require('symlink-or-copy').sync;
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');

const { buildAll } = require('glimmer-benchmark');

module.exports = {
  name: require('./package').name,

  isDevelopingAddon() {
    return true;
  },

  preBuild() {
    const dir = findOutputPath();
    try {
      fs.removeSync(`${dir}/node_modules/@glimmer`);
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  },

  async outputReady() {
    const dir = findOutputPath();
    fs.mkdirsSync(`${dir}/@glimmer`);
    fs.mkdirsSync(`${dir}/node_modules`);

    symlinkOrCopy(`${dir}/@glimmer`, `${dir}/node_modules/@glimmer`);

    if (!dir.endsWith('control-dist') && process.env.EMBER_ENV === 'production') {
      await buildAll();
    }
  },
};

function findOutputPath() {
  const argv = process.argv;
  let index = argv.indexOf('--output-path');
  if (index === -1) {
    index = argv.indexOf('-o');
  }
  if (index === -1) {
    return defaultOutputPath();
  }
  index++;
  if (index < argv.length) {
    return path.resolve(argv[index]);
  }
  return defaultOutputPath();
}

function defaultOutputPath() {
  return path.resolve(rootDir, 'dist');
}
