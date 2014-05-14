#!/usr/bin/env node

var broccoli = require('broccoli');
var RSVP     = require('rsvp');
var rimraf   = RSVP.denodeify(require('rimraf'));
var ncp      = RSVP.denodeify(require('ncp'));
var mkdir    = RSVP.denodeify(require('fs').mkdir);
var chalk    = require('chalk');


process.env.BROCCOLI_ENV = process.env.BROCCOLI_ENV || 'production';
var tree    = broccoli.loadBrocfile();
var builder = new broccoli.Builder(tree);

var buildPath = process.argv[2] || 'dist';

builder.build()
  .then(function(results) {
    return rimraf(buildPath)
      .then(function() {
        return mkdir(buildPath);
      })
      .then(function() {
        return ncp(results.directory, buildPath, {
          clobber: true,
          stopOnErr: true
        });
      });
  })
  .then(function() {
    console.log(chalk.green('Built project successfully. Stored in "' + buildPath + '/".\n'));
  })
  .catch(function(err) {
    console.log(chalk.red('Build failed.\n'));

    if (err.file) {
      console.log('File: ' + err.file + '\n');
    }
    console.log(err.stack);
  })
  .finally(function() {
    return builder.cleanup();
  });

