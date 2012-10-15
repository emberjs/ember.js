// PhantomJS QUnit Test Runner

/*globals QUnit phantom*/

var args = phantom.args;
if (args.length < 1 || args.length > 2) {
  console.log("Usage: " + phantom.scriptName + " <URL> <timeout>");
  phantom.exit(1);
}

var fs = require('fs');
function print(str) {
  fs.write('/dev/stdout', str, 'w');
}

var page = require('webpage').create();

page.onConsoleMessage = function(msg) {
  if (msg.slice(0,8) === 'WARNING:') { return; }

  // Hack to access the print method
  // If there's a better way to do this, please change
  if (msg.slice(0,6) === 'PRINT:') {
    print(msg.slice(7));
    return;
  }

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
  var moduleErrors = [];
  var testErrors = [];
  var assertionErrors = [];

  console.log("\nRunning: " + JSON.stringify(QUnit.urlParams) + "\n");

  QUnit.moduleDone(function(context) {
    if (context.failed) {
      var msg = "Module Failed: " + context.name + "\n" + testErrors.join("\n");
      moduleErrors.push(msg);
      testErrors = [];
    }
  });

  QUnit.testDone(function(context) {
    if (context.failed) {
      var msg = "  Test Failed: " + context.name + assertionErrors.join("    ");
      testErrors.push(msg);
      assertionErrors = [];
      console.log('PRINT: F');
    } else {
      console.log('PRINT: .');
    }
  });

  QUnit.log(function(context) {
    if (context.result) { return; }

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
    console.log('\n');

    if (moduleErrors.length > 0) {
      for (var idx=0; idx<moduleErrors.length; idx++) {
        console.error(moduleErrors[idx]+"\n");
      }
    }

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
