#!/usr/bin/env node

var RSVP = require('rsvp');
var spawn = require('child_process').spawn;
var fs = require('fs');
var chalk = require('chalk');
var packages = require('../packages');
var testrunner = require("qunit");
testrunner.setup({log:{errors:true}});

var runnerPath = 'bower_components/qunit-phantom-runner/runner.js';
var qunitIndexPath = './dist/test/index.html';

function runBrowserTests(queryString) {
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

function runNodeTests(testDir) {
  var nodeTests = fs.readdirSync(testDir),
      testPaths = [];

  for (var i=0;i<nodeTests.length;i++){
    if (nodeTests[i].match(/.*node-test\.js$/)) {
      testPaths.push(testDir+nodeTests[i]);
    }
  }

  return new RSVP.Promise(function(resolve, reject){
    console.log("Running: Node test runner against "+testPaths.join(", "));
    testrunner.run({
      code: "test/node-context.js",
      tests: testPaths
    }, function(e, summary){
      if (e) {
        console.log(chalk.red("Error running node tests"));
        return reject(e);
      }
      var summaryText = "Took "+summary.runtime+"ms to run "+
        summary.assertions+" assertions ("+summary.tests+" tests) in node. "+
        summary.passed+" passed, "+summary.failed+" failed.";
      if (summary.failed > 0) {
        console.log(chalk.red(summaryText));
        return reject(e);
      }
      console.log(chalk.green(summaryText));
      resolve(e);
    });
  });
}

// Run the tests for each package in sequence.

var testRuns = RSVP.resolve();

Object.keys(packages.dependencies).forEach(function(packageName){
  testRuns = testRuns.then(function(){
    console.log('----');
    return runBrowserTests("?packages=" + packageName);
  });
  if (packages.dependencies[packageName].node) {
    var testDir = 'dist/'+packageName+'-tests/';
    testRuns = testRuns.then(function(){
      console.log('----');
      return runNodeTests(testDir);
    });
  }
});

testRuns
  .then(function() {
    console.log(chalk.green('Passed!'));
    process.exit(0);
  })
  .catch(function(e) {
    console.error(chalk.red('Failed!'), e);
    process.exit(1);
  });
