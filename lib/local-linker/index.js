'use strict';

let fs = require('fs-extra');
let symlinkOrCopy = require('symlink-or-copy').sync;

let dir = `${__dirname}/../../dist`;

module.exports = {
  name: require('./package').name,

  isDevelopingAddon() {
    return true;
  },

  preBuild() {
    fs.removeSync(`${dir}/node_modules`);
  },

  outputReady() {
    fs.mkdirsSync(`${dir}/@glimmer`);
    fs.mkdirsSync(`${dir}/node_modules`);

    symlinkOrCopy(`${dir}/@glimmer`, `${dir}/node_modules/@glimmer`);
  },
};
