#!/usr/bin/env node

var RSVP = require('rsvp');
var spawn = require('child_process').spawn;
var chalk = require('chalk');
var packages = require('../packages');

var runnerPath = 'bower_components/qunit-phantom-runner/runner.js';
var qunitIndexPath = './dist/test/index.html';

function run(queryString) {
  return new RSVP.Promise(function(resolve, reject) {
    var command = 'phantomjs';
    var args = [runnerPath, qunitIndexPath + (queryString || "")];

    console.log('Running: ' + command + ' ' + args.join(' '));

    var child = spawn(command, args);
    var result = {output: [], errors: [], code: null};

    child.stdout.on('data', function (data) {
      var string = data.toString();
      var lines = string.split('\n');

      lines.forEach(function(line) {
        if (line.indexOf('0 failed.') > -1) {
          console.log(chalk.green(line));
        } else {
          console.log(line);
        }
      });
      result.output.push(string);
    });

    child.stderr.on('data', function (data) {
      var string = data.toString();
      result.errors.push(string);
      console.error(chalk.red(string));
    });

    child.on('close', function (code) {
      result.code = code;

      if (code === 0) {
        resolve(result);
      } else {
        reject(result);
      }
    });
  });
}

function runFn(queryString) {
  return function() {
    return run(queryString);
  };
}

// Run the tests for each package in sequence.

var testRuns = RSVP.resolve();

for (var packageName in packages.dependencies) {
  testRuns = testRuns.then(runFn("?packages=" + packageName));
}

testRuns
  .then(function() {
    console.log(chalk.green('Passed!'));
    process.exit(0);
  })
  .catch(function() {
    console.error(chalk.red('Failed!'));
    process.exit(1);
  });
