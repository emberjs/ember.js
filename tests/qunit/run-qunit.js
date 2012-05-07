// PhantomJS QUnit Test Runner

/*globals QUnit phantom*/

var args = phantom.args;
if (args.length < 1 || args.length > 2) {
  console.log("Usage: " + phantom.scriptName + " <URL> <timeout>");
  phantom.exit(1);
}

var page = require('webpage').create();

page.onConsoleMessage = function(msg) {
  if (msg.slice(0,8) === 'WARNING:') { return; }
  console.log(msg);
};

page.open(args[0], function(status) {
  if (status !== 'success') {
    console.error("Unable to access network");
    phantom.exit(1);
  } else {
    page.evaluate(logQUnit);

    var timeout = parseInt(args[1] || 60000, 10);
    var start = Date.now();
    var interval = setInterval(function() {
      if (Date.now() > start + timeout) {
        console.error("Tests timed out");
        phantom.exit(124);
      } else {
        var qunitDone = page.evaluate(function() {
          return window.qunitDone;
        });

        if (qunitDone) {
          clearInterval(interval);
          if (qunitDone.failed > 0) {
            phantom.exit(1);
          } else {
            phantom.exit();
          }
        }
      }
    }, 500);
  }
});

function logQUnit() {
  var testErrors = [];
  var assertionErrors = [];

  console.log("Running: " + JSON.stringify(QUnit.urlParams));

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

    var msg = "\n    Assertion Failed:";
    if (context.message) {
      msg += " " + context.message;
    }

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
