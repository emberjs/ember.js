/**
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param timeOutMillis the max amount of time to wait. If not specified, 3 sec is used.
 */

function waitFor(testFx, onReady, timeOutMillis) {
  var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 30001,
       //< Default Max Timout is 3s, just kidding it's 30s
      start = new Date().getTime(),
      condition = false,
      interval = setInterval(function() {
      if ((new Date().getTime() - start < maxtimeOutMillis) && !condition) {
        // If not time-out yet and condition not yet fulfilled
        condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
      } else {
        if (!condition) {
          // If condition still not fulfilled (timeout but condition is 'false')
          console.log("Tests timeout");
          phantom.exit(1);
        } else {
          // Condition fulfilled (timeout and/or condition is 'true')
          console.log("Tests finished in " + (new Date().getTime() - start) + "ms.");
          typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
          clearInterval(interval); //< Stop this interval
        }
      }
    }, 100); //< repeat check every 250ms
};


if (phantom.args.length === 0 || phantom.args.length > 2) {
  console.log('Usage: run-qunit.js URL');
  phantom.exit();
}

var page = new WebPage();

// Route "console.log()" calls from within the Page context to the main Phantom context (i.e. current "this")
// hide these warnings ...

page.onConsoleMessage = function(msg) {
  // annoying warnings are annoying
  if (msg.indexOf('is deprecated') < 0) {
    console.log(msg);
  }
};

page.open(phantom.args[0], function(status) {
  if (status !== "success") {
    console.log("Unable to access network");
    phantom.exit(1);
  } else {
    console.log("\n");
    waitFor(function() {
      return page.evaluate(function() {
        var el = document.getElementById('qunit-testresult');
        if (el && el.innerText.match('completed')) {
          return true;
        }
        return false;
      });
    }, function() {
      var data = page.evaluate(function() {
        var el = document.getElementById('qunit-testresult');

        try {
          failedNum = el.getElementsByClassName('failed')[0].innerHTML;
        } catch (e) {
          failedNum = 10000;
        }

        return { failedNum: failedNum, resultsText: el.innerText };
      });

      var failed = parseInt(data.failedNum, 10) > 0;

      if (failed) {
        var failures = page.evaluate(function() {
          var testEls = document.getElementById('qunit-tests').children,
              failures = [];
              len = testEls.length, idx;

          for (idx=0; idx<len; idx++) {
            if (testEls[idx].className === 'fail') {
              var children = testEls[idx].children;
              failures.push(children[0].innerText+"\n    "+(children[2].innerText.split("\n").join("    \n")));
            }
          }

          return failures;
        });

        console.log("\nFailures:\n\n"+failures.join("\n\n")+"\n\n");
      }

      console.log(data.resultsText);

      phantom.exit(failed ? 1 : 0);
    });
  }
});
