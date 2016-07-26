#!/usr/bin/env node

var QUnit = require('qunitjs');
var chalk = require('chalk');
var path = require('path');
var glob = require('glob');

QUnit.moduleStart(function(details) {
  if (details.name) {
    console.log('Running: ' + chalk.bold.cyan(details.name));
  }
});


QUnit.log(function( details ) {
  if (!details.result) {
    var output = chalk.bold.red('✗ FAILURE') + ' ' + ( details.message ? details.message + ', ' : '' );

    if (details.actual) {
      output += 'expected: ' + chalk.bold.green(details.expected) + ', actual: ' + chalk.bold.red(details.actual);
    }

    if (details.source) {
      output += '\n' + details.source;
    }

    console.log(output);
  } else {
    console.log(chalk.bold.green('✓') + ' ' + details.name  + ( details.message ? ': ' + details.message : '') );
  }

});

glob.sync('./dist/node_modules/glimmer-node/tests/**/*-test.js').forEach(function(file) {
  require(path.resolve(file));
});

QUnit.load();