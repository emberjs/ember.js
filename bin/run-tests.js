#!/usr/bin/env node

var RSVP  = require('rsvp');
var spawn = require('child_process').spawn;
var chalk = require('chalk');
var packages = require('../lib/packages');
var runInSequence = require('../lib/run-in-sequence');

function shouldPrint(inputString) {
  var skipStrings = [
    "*** WARNING: Method userSpaceScaleFactor",
    "CoreText performance note:",
  ];

  for (var i = 0; i < skipStrings.length; i++) {
    if (inputString.indexOf(skipStrings[i])) {
      return false;
    }
  }

  return true;
}

function run(queryString) {
  return new RSVP.Promise(function(resolve, reject) {
    var args = [
      'bower_components/qunit-phantom-runner/runner.js',
      './dist/tests/index.html?' + queryString
    ];

    console.log('Running: phantomjs ' + args.join(' '));

    var child = spawn('phantomjs', args);
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

      if (shouldPrint(string)) {
        result.errors.push(string);
        console.error(chalk.red(string));
      }
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

var testFunctions = [];

function generateEachPackageTests() {
  Object.keys(packages).forEach(function(packageName) {
    if (packages[packageName].skipTests) { return; }

    testFunctions.push(function() {
      return run('package=' + packageName);
    });
    testFunctions.push(function() {
      return run('package=' + packageName + '&enableoptionalfeatures=true');
    });
  });
}

function generateBuiltTests() {
  // container isn't publicly available
  // ember-testing/ember-debug are stripped from prod/min
  var common = 'skipPackage=container,ember-testing,ember-debug';
  testFunctions.push(function() {
    return run(common + '&nojshint=true');
  });
  testFunctions.push(function() {
    return run(common + '&dist=min&prod=true');
  });
  testFunctions.push(function() {
    return run(common + '&dist=prod&prod=true');
  });
  testFunctions.push(function() {
    return run(common + '&enableoptionalfeatures=true&dist=prod&prod=true');
  });
}

function generateOldJQueryTests() {
  testFunctions.push(function() {
    return run('jquery=1.8.3&nojshint=true');
  });
  testFunctions.push(function() {
    return run('jquery=1.10.2&nojshint=true');
  });
}

function generateExtendPrototypeTests() {
  testFunctions.push(function() {
    return run('extendprototypes=true&nojshint=true');
  });
  testFunctions.push(function() {
    return run('extendprototypes=true&nojshint=true&enableoptionalfeatures=true');
  });
}

switch (process.env.TEST_SUITE) {
  case 'built-tests':
    generateBuiltTests();
    break;
  case 'old-jquery':
    generateOldJQueryTests();
    break;
  case 'extend-prototypes':
    generateExtendPrototypeTests();
    break;
  case 'all':
    generateBuiltTests();
    generateOldJQueryTests();
    generateExtendPrototypeTests();
    generateEachPackageTests();
    break;
  case 'node':
    require('./run-node-tests');
    return;
  default:
    generateEachPackageTests();
}

runInSequence(testFunctions)
  .then(function() {
    console.log(chalk.green('Passed!'));
    process.exit(0);
  })
  .catch(function() {
    console.error(chalk.red('Failed!'));
    process.exit(1);
  });
