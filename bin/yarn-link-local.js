'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const glob = require('glob');

let cwd = path.resolve(__dirname, '..');
let packages = glob.sync('dist/@glimmer/*/', { cwd }).map((f) => path.resolve(cwd, f));
const nodeModules = path.resolve(__dirname, '..', 'node_modules', '@glimmer');

mkdirp.sync(nodeModules);

packages.forEach(link);

function link(dir) {
  try {
    let target = path.join(nodeModules, path.basename(dir));

    if (isDirectory(dir) && !isSymlink(target)) {
      let source = dir;

      console.log(source, '->', target);

      try {
        fs.symlinkSync(source, target, 'junction');
      } catch (err) {
        console.log(err.toString());
      }
    }
  } finally {
    process.chdir(cwd);
  }
}

function isDirectory(file) {
  try {
    let stat = fs.lstatSync(file);
    return stat.isDirectory();
  } catch (e) {
    return false;
  }
}

function isSymlink(file) {
  try {
    let stat = fs.lstatSync(file);
    return stat.isSymbolicLink();
  } catch (e) {
    return false;
  }
}
