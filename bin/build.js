#!/usr/bin/env node

var mkdir = require('fs').mkdir;
var rimraf = require('rimraf').sync;
var chalk = require('chalk');
var broccoli = require('broccoli');
var copyRecursivelySync = require('broccoli-kitchen-sink-helpers').copyRecursivelySync;

process.env.BROCCOLI_ENV = process.env.BROCCOLI_ENV || 'production';
var tree = broccoli.loadBrocfile();
var builder = new broccoli.Builder(tree);

var buildPath = process.argv[2] || 'dist';

console.log('Building HTMLBars "' + process.env.BROCCOLI_ENV + '" to "' + buildPath + '/"...');

builder.build()
  .then(function(results) {
    rimraf(buildPath);
    mkdir(buildPath);
    copyRecursivelySync(results.directory, buildPath);
  })
  .then(function() {
    console.log(chalk.green('Built project successfully. Stored in "' + buildPath + '/".\n'));
  })
  .finally(function() {
    return builder.cleanup();
  })
  .catch(function(err) {
    console.log(chalk.red('Build failed.\n'));

    if (err.file) {
      console.log('File: ' + err.file + '\n');
    }
    console.log(err.stack);
    process.exit(1);
  });
