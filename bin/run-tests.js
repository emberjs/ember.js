/* eslint-disable no-console, node/no-unsupported-features */
'use strict';

const execa = require('execa');
const execFile = require('child_process').execFile;
const chalk = require('chalk');
const runInSequence = require('../lib/run-in-sequence');
const path = require('path');

const finalhandler = require('finalhandler');
const http = require('http');
const serveStatic = require('serve-static');
const puppeteer = require('puppeteer');
const fs = require('fs');

// Serve up public/ftp folder.
const serve = serveStatic('./dist/', { index: ['index.html', 'index.htm'] });

// Create server.
const server = http.createServer(function(req, res) {
  let done = finalhandler(req, res);
  serve(req, res, done);
});

const PORT = 13141;
// Listen.
server.listen(PORT);

class BroswerRunner {
  constructor() {
    this.resolveTest = undefined;
    this.rejectTest = undefined;
    this._browser = undefined;
    this._page = undefined;
  }

  async run(url, attempts) {
    let result = await this.getResultWithRetry(url, attempts);
    var failed = !result || !result.total || result.failed;
    if (failed) {
      throw result;
    }
    return result;
  }

  async getResultWithRetry(url, attempts) {
    while (attempts > 0) {
      try {
        return await this.getResult(url);
      } catch (err) {
        attempts--;
        if (attempts > 0) {
          console.log(chalk.red(err.toString()));
          console.log(chalk.yellow('Retrying... ¯\\_(ツ)_/¯'));
        } else {
          console.log(chalk.red('Giving up! (╯°□°)╯︵ ┻━┻'));
          throw err;
        }
      }
    }
  }

  async getResult(url) {
    let test = new Promise((resolve, reject) => {
      this.resolveTest = resolve;
      this.rejectTest = reject;
    });
    let page = await this.page();
    await page.goto(url);
    return await test;
  }

  browser() {
    if (this._browser === undefined) {
      this._browser = this.newBrowser();
    }
    return this._browser;
  }

  page() {
    if (this._page === undefined) {
      this._page = this.newPage();
    }
    return this._page;
  }

  async newBrowser() {
    let browser = await puppeteer.launch({ dumpio: true });
    return browser;
  }

  async newPage() {
    let browser = await this.browser();
    let oldPages = await browser.pages();
    let newPage = await browser.newPage();

    // close existing pages
    for (let oldPage of oldPages) {
      try {
        await oldPage.close();
      } catch (e) {
        console.error(e);
      }
    }

    // corresponds to Inspector.targetCrashed
    newPage.once('error', this.onError.bind(this));

    await newPage.evaluateOnNewDocument(
      fs.readFileSync(__dirname + '/run-tests-injection.js', 'utf8')
    );

    await newPage.exposeFunction('sendMessageToHost', this.onMessage.bind(this));

    return newPage;
  }

  onMessage(message) {
    if (message && message.name === 'QUnit.done') {
      this.resolveTest(message.data);
    }
  }

  onError(err) {
    // reject current test run and retry
    this.rejectTest(err);
    this._page = undefined;
  }
}

// Cache the Chrome browser instance when launched for new pages.
let browserRunner;

function getBrowserRunner() {
  if (browserRunner === undefined) {
    browserRunner = new BroswerRunner();
  }
  return browserRunner;
}

function run(queryString) {
  var url = 'http://localhost:' + PORT + '/tests/?' + queryString;
  return runInBrowser(url, 3);
}

function runInBrowser(url, attempts) {
  console.log('Running Chrome headless: ' + url);
  return getBrowserRunner().run(url, attempts);
}

var testFunctions = [];

function generateTestsFor(packageName) {
  let relativePath = path.join('packages', packageName);

  if (!fs.existsSync(path.join(relativePath, 'tests'))) {
    return;
  }

  testFunctions.push(function() {
    return run('package=' + packageName);
  });
  testFunctions.push(function() {
    return run('package=' + packageName + '&dist=es');
  });
  testFunctions.push(function() {
    return run('package=' + packageName + '&enableoptionalfeatures=true');
  });

  // TODO: this should ultimately be deleted (when all packages can run with and
  // without jQuery)
  if (packageName !== 'ember') {
    testFunctions.push(function() {
      return run('package=' + packageName + '&jquery=none');
    });
  }
}

function generateEachPackageTests() {
  fs.readdirSync('packages/@ember').forEach(e => generateTestsFor(`@ember/${e}`));

  fs
    .readdirSync('packages')
    .filter(e => e !== '@ember')
    .forEach(generateTestsFor);
}

function generateBuiltTests() {
  // Container isn't publicly available.
  // ember-testing and @ember/debug are stripped from prod/min.
  var common = 'skipPackage=container,ember-testing,@ember/debug';
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

function runChecker(bin, args) {
  return new Promise(function(resolve) {
    execFile(bin, args, {}, function(error, stdout, stderr) {
      // I'm buffering instead of inheriting these so that each
      // checker doesn't interleave its output
      process.stdout.write(stdout.toString('utf8'));
      process.stderr.write(stderr.toString('utf8'));
      resolve({ name: path.basename(args[0]), ok: !error });
    });
  });
}

function codeQualityChecks() {
  var checkers = [
    runChecker('node', [require.resolve('typescript/bin/tsc'), '--noEmit']),
    runChecker('node', [require.resolve('tslint/bin/tslint'), '-p', 'tsconfig.json']),
    runChecker('node', [require.resolve('eslint/bin/eslint'), '.']),
  ];
  return Promise.all(checkers).then(function(results) {
    results.forEach(result => {
      if (result.ok) {
        console.log(result.name + ': ' + chalk.green('OK'));
      } else {
        console.log(result.name + ': ' + chalk.red('Failed'));
      }
    });
    if (!results.every(result => result.ok)) {
      throw new Error('Some quality checks failed');
    }
  });
}

function runAndExit() {
  runInSequence(testFunctions)
    .then(function() {
      console.log(chalk.green('Passed!'));
      process.exit(0);
    })
    .catch(function(err) {
      console.error(chalk.red(err.toString()));
      console.error(chalk.red('Failed!'));
      process.exit(1);
    });
}

let p = process.env.PACKAGE || 'ember';
switch (process.env.TEST_SUITE) {
  case 'package':
    console.log(`suite: package ${p}`);
    generateTestsFor(p);
    runAndExit();
    break;
  case 'built-tests':
    console.log('suite: built-tests');
    generateBuiltTests();
    runAndExit();
    break;
  case 'old-jquery-and-extend-prototypes':
    console.log('suite: old-jquery-and-extend-prototypes');
    generateOldJQueryTests();
    generateExtendPrototypeTests();
    runAndExit();
    break;
  case 'all':
    console.log('suite: all');
    generateBuiltTests();
    generateOldJQueryTests();
    generateExtendPrototypeTests();
    generateEachPackageTests();
    runAndExit();
    break;
  case 'node': {
    console.log('suite: node');
    let stream = execa('yarn', ['test:node']);
    stream.stdout.pipe(process.stdout);
    stream.then(
      function() {
        console.log(chalk.green('Passed!'));
        process.exit(0);
      },
      function() {
        console.error(chalk.red('Failed!'));
        process.exit(1);
      }
    );
    break;
  }
  case 'blueprints':
    console.log('suite: blueprints');
    require('../node-tests/nodetest-runner');
    server.close();
    break;
  case 'travis-browsers':
    console.log('suite: travis-browsers');
    require('./run-travis-browser-tests');
    break;
  case 'browserstack':
    console.log('suite: browserstack');
    require('./run-browserstack-tests');
    break;
  case 'code-quality':
    testFunctions.push(codeQualityChecks);
    runAndExit();
    break;
  default:
    console.log('suite: default (generate each package)');
    generateEachPackageTests();
    runAndExit();
}
