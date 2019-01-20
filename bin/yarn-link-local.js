'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const glob = require('glob');
const chalk = require('chalk');

let cwd = path.resolve(__dirname, '..');
let packages = glob.sync('packages/@glimmer/*/', { cwd }).map(f => path.resolve(cwd, f));
const node_modules = path.resolve(__dirname, '..', 'node_modules', '@glimmer');
const package_root = path.resolve(__dirname, '..', 'packages', '@glimmer');

mkdirp.sync(node_modules);

packages.forEach(link);

function link(dir) {
  try {
    let target = path.join(node_modules, path.basename(dir));

    if (isDirectory(dir) && !isSymlink(target)) {
      let target = path.join(node_modules, path.basename(dir));
      let source = dir;

      // console.log(chalk.blue(source), '->', chalk.blue(target));

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

function exec(cmd) {
  console.log(chalk.blue(cmd));
  return execSync(cmd, { cwd });
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
