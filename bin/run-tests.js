/* eslint-disable no-console */
'use strict';

const chalk = require('chalk');
const path = require('path');

const finalhandler = require('finalhandler');
const http = require('http');
const serveStatic = require('serve-static');
const fs = require('fs');

// Serve up public/ftp folder.
const serve = serveStatic('./dist/', { index: ['index.html', 'index.htm'] });

// Create server.
const server = http.createServer(function (req, res) {
  let done = finalhandler(req, res);
  serve(req, res, done);
});

const PORT = 13141;
// Listen.
server.listen(PORT);

// Cache the Chrome browser instance when launched for new pages.
let browserRunner;

function getBrowserRunner() {
  if (browserRunner === undefined) {
    // requires new node
    let BrowserRunner = require('./run-tests-browser-runner');
    browserRunner = new BrowserRunner();
  }
  return browserRunner;
}

function run(queryString) {
  if (process.env.DEBUG_RENDER_TREE) {
    queryString = `${queryString}&debugrendertree`;
  }

  let url = 'http://localhost:' + PORT + '/tests/?' + queryString;
  return runInBrowser(url, 3);
}

function runInBrowser(url, attempts) {
  console.log('Running Chrome headless: ' + url);
  return getBrowserRunner().run(url, attempts);
}

let testFunctions = [];

function generateTestsFor(packageName) {
  let relativePath = path.join('packages', packageName);

  if (!fs.existsSync(path.join(relativePath, 'tests'))) {
    return;
  }

  testFunctions.push(() => run('package=' + packageName));
  testFunctions.push(() => run('package=' + packageName + '&edition=classic'));
  testFunctions.push(() => run('package=' + packageName + '&prebuilt=true'));
  testFunctions.push(() => run('package=' + packageName + '&enableoptionalfeatures=true'));
}

function generateEachPackageTests() {
  fs.readdirSync('packages/@ember')
    .filter((e) => e !== '-internals')
    .forEach((e) => generateTestsFor(`@ember/${e}`));

  fs.readdirSync('packages/@ember/-internals').forEach((e) =>
    generateTestsFor(`@ember/-internals/${e}`)
  );

  fs.readdirSync('packages')
    .filter((e) => e !== '@ember')
    .forEach(generateTestsFor);
}

function generateStandardTests() {
  testFunctions.push(() => run(''));
  testFunctions.push(() => run('edition=classic'));
  testFunctions.push(() => run('enableoptionalfeatures=true'));
}

function generateExtendPrototypeTests() {
  testFunctions.push(() => run('extendprototypes=true'));
  testFunctions.push(() => run('extendprototypes=true&enableoptionalfeatures=true'));
}

function runInSequence(tasks) {
  let length = tasks.length;
  let current = Promise.resolve();
  let results = new Array(length);

  for (let i = 0; i < length; ++i) {
    current = results[i] = current.then(tasks[i]);
  }

  return Promise.all(results);
}

function runAndExit() {
  runInSequence(testFunctions)
    .then(function () {
      console.log(chalk.green('Passed!'));
      process.exit(0); // eslint-disable-line n/no-process-exit
    })
    .catch(function (err) {
      console.error(chalk.red(err.toString()));
      console.error(chalk.red('Failed!'));
      process.exit(1); // eslint-disable-line n/no-process-exit
    });
}

let p = process.env.PACKAGE || 'ember';
switch (process.env.TEST_SUITE) {
  case 'package':
    console.log(`suite: package ${p}`);
    generateTestsFor(p);
    runAndExit();
    break;
  case 'each-package':
    console.log('suite: each-package');
    generateEachPackageTests();
    runAndExit();
    break;
  case 'extend-prototypes':
    console.log('suite: extend-prototypes');
    generateExtendPrototypeTests();
    runAndExit();
    break;
  case 'all':
    console.log('suite: all');
    generateExtendPrototypeTests();
    generateEachPackageTests();
    runAndExit();
    break;
  default:
    console.log('suite: default (generate each package)');
    generateStandardTests();
    runAndExit();
}
