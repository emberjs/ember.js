/*
 * Qt+WebKit powered (mostly) headless test runner using Phantomjs
 *
 * Phantomjs installation: http://code.google.com/p/phantomjs/wiki/BuildInstructions
 *
 * Run with:
 *  phantomjs test.js [url-of-your-qunit-testsuite]
 *
 * E.g.
 *      phantomjs test.js http://localhost/qunit/test
 */

var url = phantom.args[0];

var page = require('webpage').create();

//Route "console.log()" calls from within the Page context to the main Phantom context (i.e. current "this")
page.onConsoleMessage = function(msg) {
  if (msg.slice(0,12) !== 'DEPRECATION:') {
    console.log(msg);
  }
};

page.open(url, function(status){
  if (status !== "success") {
    console.log("Unable to access network: " + status);
    phantom.exit(1);
  } else {
    page.evaluate(addLogging);
    var interval = setInterval(function() {
      if (finished()) {
        clearInterval(interval);
        onfinishedTests();
      }
    }, 500);
  }
});

function finished() {
  return page.evaluate(function(){
    return !!window.qunitDone;
  });
};

function onfinishedTests() {
  var output = page.evaluate(function() {
      return JSON.stringify(window.qunitDone);
  });
  phantom.exit(JSON.parse(output).failed > 0 ? 1 : 0);
};

function addLogging() {
  var current_test_assertions = [];
  var module;

  QUnit.moduleStart(function(context) {
    module = context.name;
  });

  QUnit.testDone(function(result) {
    var name = module + ': ' + result.name;
    var i;

    if (result.failed) {
      console.log('Assertion Failed: ' + name);

      for (i = 0; i < current_test_assertions.length; i++) {
        console.log('    ' + current_test_assertions[i]);
      }
    }

    current_test_assertions = [];
  });

  QUnit.log(function(details) {
    var response;

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

    current_test_assertions.push('Failed assertion: ' + response);
  });

  QUnit.done(function(result){
    console.log('Took ' + result.runtime +  'ms to run ' + result.total + ' tests. ' + result.passed + ' passed, ' + result.failed + ' failed.');
    window.qunitDone = result;
  });
}
