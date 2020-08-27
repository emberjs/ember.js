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

    if (path.basename(dir) !== 'control-dist' && process.env.EMBER_ENV === 'production') {
      await buildAll();
    }
  },
};

function findOutputPath() {
  const argv = process.argv;
  let value = parseArgValue(argv, '--output-path');
  if (!value) {
    value = parseArgValue(argv, '-o');
  }
  if (value) {
    return path.resolve(value);
  }
  return defaultOutputPath();
}

/**
 * @param {string[]} argv
 * @param {string} name
 */
function parseArgValue(argv, name) {
  let index = argv.findIndex(arg => arg === name);
  if (index > -1) {
    return argv[index + 1];
  }
  name += '=';
  let value = argv.find(arg => arg.startsWith(name));
  return value ? value.slice(name.length) : undefined;
}

function defaultOutputPath() {
  return path.resolve(rootDir, 'dist');
}
