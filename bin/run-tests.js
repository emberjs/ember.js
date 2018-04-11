/* globals QUnit */
/* eslint-disable no-console */
'use strict';

var execa = require('execa');
var RSVP = require('rsvp');
var execFile = require('child_process').execFile;
var chalk = require('chalk');
var runInSequence = require('../lib/run-in-sequence');
var path = require('path');

var finalhandler = require('finalhandler');
var http = require('http');
var serveStatic = require('serve-static');
var puppeteer = require('puppeteer');
const fs = require('fs');

// Serve up public/ftp folder.
var serve = serveStatic('./dist/', { index: ['index.html', 'index.htm'] });

// Create server.
var server = http.createServer(function(req, res) {
  var done = finalhandler(req, res);
  serve(req, res, done);
});

var PORT = 13141;
// Listen.
server.listen(PORT);

// Cache the Chrome browser instance when launched for new pages.
var browserPromise;

function run(queryString) {
  return new RSVP.Promise(function(resolve, reject) {
    var url = 'http://localhost:' + PORT + '/tests/?' + queryString;
    runInBrowser(url, 3, resolve, reject);
  });
}

function runInBrowser(url, retries, resolve, reject) {
  var result = { output: [], errors: [], code: null };

  console.log('Running Chrome headless: ' + url);

  if (!browserPromise) {
    browserPromise = puppeteer.launch();
  }

  browserPromise.then(function(browser) {
    browser.newPage().then(function(page) {
      /* globals window */
      var crashed;

      page.on('console', function(msg) {
        console.log(msg.text);

        result.output.push(msg.text);
      });

      page.on('error', function(err) {
        var string = err.toString();

        if (string.indexOf('Chrome headless has crashed.') > -1) {
          crashed = true;
        }

        result.errors.push(string);
        console.error(chalk.red(string));
      });

      var addLogging = function() {
        window.document.addEventListener('DOMContentLoaded', function() {
          var testsTotal = 0;
          var testsPassed = 0;
          var testsFailed = 0;
          var currentTestAssertions = [];

          QUnit.log(function(details) {
            var response;

            // Ignore passing assertions
            if (details.result) {
              return;
            }

            response = details.message || '';

            if (typeof details.expected !== 'undefined') {
              if (response) {
                response += ', ';
              }

              response += 'expected: ' + details.expected + ', but was: ' + details.actual;
            }

            if (details.source) {
              response += '\n' + details.source;
            }

            currentTestAssertions.push('Failed assertion: ' + response);
          });

          QUnit.testDone(function(result) {
            var i,
              len,
              name = '';

            if (result.module) {
              name += result.module + ': ';
            }
            name += result.name;

            testsTotal++;

            if (result.failed) {
              testsFailed++;
              console.log('\n' + 'Test failed: ' + name);

              for (i = 0, len = currentTestAssertions.length; i < len; i++) {
                console.log('    ' + currentTestAssertions[i]);
              }
            } else {
              testsPassed++;
            }

            currentTestAssertions.length = 0;
          });

          QUnit.done(function(result) {
            console.log(
              '\n' +
                'Took ' +
                result.runtime +
                'ms to run ' +
                testsTotal +
                ' tests. ' +
                testsPassed +
                ' passed, ' +
                testsFailed +
                ' failed.'
            );

            window.callPhantom({
              name: 'QUnit.done',
              data: result,
            });
          });
        });
      };

      return page
        .exposeFunction('callPhantom', function(message) {
          page.close();

          if (message && message.name === 'QUnit.done') {
            result = message.data;
            var failed = !result || !result.total || result.failed;

            if (!result.total) {
              console.error('No tests were executed. Are you loading tests asynchronously?');
            }

            var code = failed ? 1 : 0;
            result.code = code;

            if (!crashed && code === 0) {
              resolve(result);
            } else if (crashed) {
              console.log(chalk.red('Browser crashed with exit code ' + code));

              if (retries > 1) {
                console.log(chalk.yellow('Retrying... ¯\\_(ツ)_/¯'));
                runInBrowser(url, retries - 1, resolve, reject);
              } else {
                console.log(chalk.red('Giving up! (╯°□°)╯︵ ┻━┻'));
                console.log(
                  chalk.yellow('This might be a known issue with Chrome headless, skipping for now')
                );
                resolve(result);
              }
            } else {
              reject(result);
            }
          }
        })
        .then(function() {
          return page.evaluateOnNewDocument(addLogging);
        })
        .then(function() {
          return page.goto(url, { timeout: 900 });
        });
    });
  });
}

var testFunctions = [];

function generateEachPackageTests() {
  let entries = fs.readdirSync('packages');
  entries.forEach(entry => {
    let relativePath = path.join('packages', entry);

    if (!fs.existsSync(path.join(relativePath, 'tests'))) {
      return;
    }

    testFunctions.push(function() {
      return run('package=' + entry);
    });
    testFunctions.push(function() {
      return run('package=' + entry + '&dist=es');
    });
    testFunctions.push(function() {
      return run('package=' + entry + '&enableoptionalfeatures=true');
    });

    // TODO: this should ultimately be deleted (when all packages can run with and
    // without jQuery)
    if (entry !== 'ember') {
      testFunctions.push(function() {
        return run('package=' + entry + '&jquery=none');
      });
    }
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

function runChecker(bin, args) {
  return new RSVP.Promise(function(resolve) {
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
  return RSVP.Promise.all(checkers).then(function(results) {
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
    .catch(function() {
      console.error(chalk.red('Failed!'));
      process.exit(1);
    });
}

switch (process.env.TEST_SUITE) {
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
