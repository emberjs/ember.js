// PhantomJS QUnit Test Runner

var args = phantom.args;

if (args.length < 1 || args.length > 2) {
  console.log("Usage: " + phantom.scriptName + " <URL> <timeout>");
  phantom.exit(1);
}

var page = require('webpage').create();

page.onConsoleMessage = function(msg) {
  if (!/^DEPRECATION:/.test(msg)) console.log(msg);
};

page.open(args[0], function(status) {
  if (status !== 'success') {
    console.error("Unable to access network");
    phantom.exit(1);
  }

  page.evaluate(addLogging);

  var timeout = parseInt(args[1] || 30000);
  var start = Date.now();

  var interval = setInterval(function() {
    if (Date.now() > start + timeout) {
      console.error("Tests timed out");
      phantom.exit(1);
    }

    if (isDone()) {
      clearInterval(interval);
      if (didFail()) phantom.exit(1);
      phantom.exit();
    }
  }, 500);
});

function isDone() {
  return page.evaluate(function() {
    return !!window.qunitDone;
  });
}

function didFail() {
  var output = page.evaluate(function() {
    return window.qunitDone;
  });
  return output && output.failed > 0;
}

function addLogging() {
  var testErrors = [];
  var assertionErrors = [];

  QUnit.moduleDone(function(context) {
    if (context.failed) {
      var msg = "Module Failed: " + context.name + "\n" + testErrors.join("\n");
      console.error(msg);
      testErrors = [];
    }
  });

  QUnit.testDone(function(context) {
    if (context.failed) {
      var msg = "  Test Failed: " + context.name + assertionErrors.join("    ");
      testErrors.push(msg);
      assertionErrors = [];
    }
  });

  QUnit.log(function(context) {
    if (context.result) return;

    var msg = "\n    Assertion Failed: " + (context.message || "");
    if (context.expected) {
      msg += "\n      Expected: " + context.expected + ", Actual: " + context.actual;
    }

    assertionErrors.push(msg);
  });

  QUnit.done(function(context) {
    var stats = [
      "Time: " + context.runtime + "ms",
      "Total: " + context.total,
      "Passed: " + context.passed,
      "Failed: " + context.failed
    ];
    console.log(stats.join(", "));
    window.qunitDone = context;
  });
}
