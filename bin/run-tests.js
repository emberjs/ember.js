#!/usr/bin/env node

var RSVP  = require('rsvp');
var spawn = require('child_process').spawn;
var chalk = require('chalk');
var getFeatures = require('../ember-cli-build').getFeatures;
var getPackages = require('../lib/packages');
var runInSequence = require('../lib/run-in-sequence');

var finalhandler = require('finalhandler');
var http = require('http');
var serveStatic = require('serve-static');

// Serve up public/ftp folder.
var serve = serveStatic('./dist/', { 'index': ['index.html', 'index.htm'] });

// Create server.
var server = http.createServer(function(req, res) {
  var done = finalhandler(req, res);
  serve(req, res, done);
});

var PORT = 13141;
// Listen.
server.listen(PORT);

function run(queryString) {
  return new RSVP.Promise(function(resolve, reject) {
    var url = 'http://localhost:' + PORT + '/tests/?' + queryString;
    runInPhantom(url, 3, resolve, reject);
  });
}

function runInPhantom(url, retries, resolve, reject) {
  var args = [require.resolve('qunit-phantomjs-runner'), url, '900'];

  console.log('Running: phantomjs ' + args.join(' '));

  var crashed = false;
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

    if (string.indexOf('PhantomJS has crashed.') > -1) {
      crashed = true;
    }

    result.errors.push(string);
    console.error(chalk.red(string));
  });

  child.on('close', function (code) {
    result.code = code;

    if (!crashed && code === 0) {
      resolve(result);
    } else if (crashed) {
      console.log(chalk.red('Phantom crashed with exit code ' + code));

      if (retries > 1) {
        console.log(chalk.yellow('Retrying... ¯\_(ツ)_/¯'));
        runInPhantom(url, retries - 1, resolve, reject);
      } else {
        console.log(chalk.red('Giving up! (╯°□°)╯︵ ┻━┻'));
        console.log(chalk.yellow('This might be a known issue with PhantomJS 1.9.8, skipping for now'));
        resolve(result);
      }
    } else {
      reject(result);
    }
  });
}

var testFunctions = [];

function generateEachPackageTests() {
  var features = getFeatures();
  var packages = getPackages(features);

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
  // Container isn't publicly available.
  // ember-testing/ember-debug are stripped from prod/min.
  var common = 'skipPackage=container,ember-testing,ember-debug';
  testFunctions.push(function() {
    return run(common + '&nolint=true');
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
    return run('jquery=1.8.3&nolint=true');
  });
  testFunctions.push(function() {
    return run('jquery=1.10.2&nolint=true');
  });
  testFunctions.push(function() {
    return run('jquery=2.2.4&nolint=true');
  });
}

function generateExtendPrototypeTests() {
  testFunctions.push(function() {
    return run('extendprototypes=true&nolint=true');
  });
  testFunctions.push(function() {
    return run('extendprototypes=true&nolint=true&enableoptionalfeatures=true');
  });
}

switch (process.env.TEST_SUITE) {
  case 'built-tests':
    console.log('suite: built-tests');
    generateBuiltTests();
    break;
  case 'old-jquery-and-extend-prototypes':
    console.log('suite: old-jquery-and-extend-prototypes');
    generateOldJQueryTests();
    generateExtendPrototypeTests();
    break;
  case 'all':
    console.log('suite: all');
    generateBuiltTests();
    generateOldJQueryTests();
    generateExtendPrototypeTests();
    generateEachPackageTests();
    break;
  case 'node':
    console.log('suite: node');
    require('./run-node-tests');
    return;
  case 'blueprints':
    console.log('suite: blueprints');
    require('../node-tests/nodetest-runner');
    server.close();
    return;
  case 'travis-browsers':
    console.log('suite: sauce');
    require('./run-travis-browser-tests');
    return;

  case 'sauce':
    console.log('suite: sauce');
    require('./run-sauce-tests');
    return;
  default:
    console.log('suite: default (generate each package)');
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
