// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Request Base Tests
// ========================================================================
/*globals module, test, ok, isObj, equals, expects */

var url, request, contents, test_timeout=2500;
if(window._phantom) {
    test_timeout=5000;
}

module("SC.Request", {

  setup: function() {
    url = sc_static("file_exists.json");
    request = SC.Request.getUrl(url);
    contents = null;
  },

  teardown: function() {
    url = request = contents = null;
  }

});

test("Basic Requirements", function() {
  ok(SC.Request, "SC.Request is defined");
  ok("" !== url, "url variable is not empty");
  ok(request !== null, "request object is not null");
  ok(contents === null, "contents is null" );
});

test("Default properties are correct for different types of requests.", function() {
  var formBody,
    headers,
    jsonBody,
    xmlBody,
    req1, req2, req3, req4, req5;

    // use this document for creating XML
    if (document.implementation.createDocument) {
      xmlBody = document.implementation.createDocument(null, null, null);
    } else if (typeof (ActiveXObject) != "undefined") {
      // Use ActiveXObject for IE prior to version 9.
      var progIDs = [
        "Msxml2.DOMDocument.6.0",
        "Msxml2.DOMDocument.5.0",
        "Msxml2.DOMDocument.4.0",
        "Msxml2.DOMDocument.3.0",
        "MSXML2.DOMDocument",
        "MSXML.DOMDocument"
      ];

      for (var i = 0; i < progIDs.length; i++) {
        try {
          xmlBody = new ActiveXObject(progIDs[i]);
          break;
        } catch(e) {}
      }
    }

    // function that creates the XML structure
    function o() {
      var i, node = xmlBody.createElement(arguments[0]), text, child;

      for(i = 1; i < arguments.length; i++) {
          child = arguments[i];
          if(typeof child == 'string') {
              child = xmlBody.createTextNode(child);
          }
          node.appendChild(child);
      }

      return node;
    }

    // create the XML structure recursively
    o('report',
        o('submitter',
            o('name', 'John Doe')
        ),
        o('students',
            o('student',
                o('name', 'Alice'),
                o('grade', '80')
            ),
            o('student',
                o('name', 'Bob'),
                o('grade', '90')
            )
        )
    );


  jsonBody = { a: 1, b: 2 };
  formBody = "fname=Henry&lname=Ford";
  req1 = SC.Request.getUrl(url).json()._prep();
  req2 = SC.Request.postUrl(url, formBody).header('Content-Type', 'application/x-www-form-urlencoded')._prep();
  req3 = SC.Request.putUrl(url, xmlBody).xml()._prep();
  req4 = SC.Request.patchUrl(url, jsonBody).json()._prep();
  req5 = SC.Request.deleteUrl(url)._prep();

  ok(req1.get('isJSON'), 'req1 should have isJSON true');
  ok(!req1.get('isXML'), 'req1 should have isXML false');
  equals(req1.header('Content-Type'), undefined, 'req1 should have Content-Type header as');
  ok(!req2.get('isJSON'), 'req2 should have isJSON false');
  ok(!req2.get('isXML'), 'req2 should have isXML false');
  equals(req2.header('Content-Type'), 'application/x-www-form-urlencoded', 'req2 should have Content-Type header as');
  ok(!req3.get('isJSON'), 'req3 should have isJSON false');
  ok(req3.get('isXML'), 'req3 should have isXML true');
  equals(req3.header('Content-Type'), 'text/xml', 'req3 should have Content-Type header as');
  ok(req4.get('isJSON'), 'req4 should have isJSON true');
  ok(!req4.get('isXML'), 'req4 should have isXML false');
  equals(req4.header('Content-Type'), 'application/json', 'req4 should have Content-Type header as');
  ok(!req5.get('isJSON'), 'req5 should have isJSON false');
  ok(!req5.get('isXML'), 'req5 should have isXML false');
  equals(req5.header('Content-Type'), undefined, 'req5 should have Content-Type header as');
});

test("Test Asynchronous GET Request", function() {

  var response, timer;

  timer = setTimeout(function() {
    ok(false, 'response did not invoke notify() within 2sec');
    window.start();
  }, 2000);

  request.notify(this, function(response) {
    ok(SC.ok(response), 'response should not be an error');
    equals(response.get('body'), '{"message": "Yay!"}', 'should match retrieved message');
    clearTimeout(timer);
    window.start();
  });

  stop(test_timeout); // stops the test runner - wait for response

  response = request.send();
  ok(response !== null, 'request.send() should return a response object');
  ok(response.get('status')<0, 'response should still not have a return code since this should be async');
});

test("Test Synchronous GET Request", function() {
  request.set("isAsynchronous", NO);
  var response = request.send();

  ok(response !== null, 'send() should return response');
  ok(SC.$ok(response), 'contents should not be an error ');
  equals(response.get('body'), '{"message": "Yay!"}', 'should match retrieved message');
});

test("Test Asynchronous GET Request, auto-deserializing JSON", function() {
  request.set("isJSON", YES);


  var timer;

  timer = setTimeout( function(){
    ok(false, 'response did not invoke notify()');
    window.start();
  }, 1000);

  request.notify(this, function(response) {
    ok(SC.ok(response), 'response should not be error');
    same(response.get('body'), {"message": "Yay!"}, 'repsonse.body');
    clearTimeout(timer);
    window.start();
  });

  stop(test_timeout); // stops the test runner

  request.send();
});

test("Test auto-deserializing malformed JSON", function() {
  request = SC.Request.getUrl(sc_static('malformed.json')).set('isJSON', YES);

  var timer = setTimeout(function() {
    ok(false, 'response did not invoke notify()');
    window.start();
  }, 1000);

  request.notify(this, function(response) {
    ok(SC.ok(response), 'response should not be error');

    try {
      var body = response.get('body');
      ok(!SC.ok(body), 'body should be an error');
    } catch(e) {
      ok(false, 'getting the body should not throw an exception');
    }

    clearTimeout(timer);
    window.start();
  });

  stop(test_timeout);

  request.send();
});

test("Test Synchronous GET Request, auto-deserializing JSON", function() {
  request.set("isAsynchronous", false);
  request.set("isJSON", true);

  var response = request.send();

  ok(response !== null, 'response should not be null');
  ok(SC.ok(response), 'contents should not be an error');
  same(response.get('body'), {"message": "Yay!"}, 'contents should have message');
});


test("Test if Request body is being auto-serializing to JSON", function() {
  var objectToPost={"content": "garbage"};
  request.set("isJSON", true).set('body', objectToPost);

  var jsonEncoded = request.get('encodedBody');

  equals(jsonEncoded, '{"content":"garbage"}', "The json object passed in send should be encoded and set as the body");
});


test("Test Multiple Asynchronous GET Request - two immediate, and two in serial", function() {
  var requestCount = 3;
  var responseCount = 0;
  var serialCount = 0;

  var observer = function(response) {
    responseCount++;
    if (serialCount<=2) {
      serialCount++;
      SC.Request.getUrl(url).notify(this, observer).send();
      requestCount++;
    }
  };


  SC.Request.getUrl(url).notify(this, observer).send();
  SC.Request.getUrl(url).notify(this, observer).send();
  SC.Request.getUrl(url).notify(this, observer).send();

  stop(test_timeout); // stops the test runner
  setTimeout( function(){
    equals(requestCount, 6, "requestCount should be 6");
    equals(responseCount, 6, "responseCount should be 6");
    window.start(); // starts the test runner
  }, 2000);
});


//   There are two ways to be notified of request changes:
//     - Implementing a didReceive function on the SC.Request object
//     - Registering a listener using notify()
//   The following two tests test the timeout functionality for each of these.

test("Timeouts - SC.Request didReceive callback", function() {
  var message;

  // Sanity check - Should throw an error if we try to set a timeout of 0s.
  try {
    SC.Request.getUrl(url).set('timeout', 0).send();
  } catch (e) {
    message = e.message;
  }
  ok(message && message.indexOf("The timeout value must either not be specified or must be greater than 0") !== -1, 'An error should be thrown when the timeout value is 0 ms');

  // Sanity check 2 - Can't set timeouts on synchronous XHR requests
  try {
    SC.Request.getUrl(url).set('isAsynchronous', NO).set('timeout', 10).send();
  }
  catch (e2) {
    message = e2.message;
  }
  ok(message && message.indexOf("Timeout values cannot be used with synchronous requests") !== -1, 'An error should be thrown when trying to use a timeout with a synchronous request');


  // Make sure timeouts actually fire, and fire when expected.
  // Point to the server itself so that the tests will work even when offline
  var timeoutRequest = SC.Request.getUrl("/"),
      checkstop;

  var now = Date.now();

  // Set timeout as short as possible so that it will always timeout before
  // the request returns.
  // This test will fail should the response time drop to
  // below 10ms.
  timeoutRequest.set('timeout', 10);

  timeoutRequest.set('didReceive', function(request, response) {
    // Test runner is paused after the request is sent; resume unit testing
    // once we receive a response.
    start();
    clearTimeout(checkstop);

    // If this response was caused by a timeout…
    if (response.get('timedOut')) {
      equals(response.get('status'), 0,
             'Timed out responses should have status 0');

      // We should never be called before the timeout we specified
      var elapsed = Date.now()-now;
      ok(elapsed >= 10,
        'timeout must not fire earlier than 10msec - actual %@'.fmt(elapsed));
    } else {
      // We received a response from the server, which should never happen
      ok(false, 'timeout did not fire before response was received.  should have fired after 10msec.  response time: %@msec'.fmt(Date.now() - now));
    }
  });

  // Stop the test runner and wait for a timeout or a response.
  stop(test_timeout);

  SC.RunLoop.begin();
  timeoutRequest.send();
  SC.RunLoop.end();

  // In case we never receive a timeout, just start unit testing again after
  // 500ms.
  checkstop = setTimeout(function() {
    window.start();
    ok(false, 'timeout did not fire at all');
  }, 500);
});

test("Timeouts - Status listener callback", function() {
  // sanity check
  equals(SC.Request.manager.inflight.length,0,"there should be no inflight requests");

  // Make sure timeouts actually fire, and fire when expected.
  // Point to local server so test works offline
  var timeoutRequest = SC.Request.getUrl("/"),
      checkstop;

  // make the timeout as short as possible so that it will always happen
  timeoutRequest.timeoutAfter(10).notify(this, function(response) {
    start();
    clearTimeout(checkstop);

    equals(response.get('status'), 0, "Status code should be zero");
    equals(response.get('timedOut'), YES, "Should have timedOut property set to YES");
    // timeout did fire...just resume...

    return YES;
  });

  stop(test_timeout); // stops the test runner

  SC.RunLoop.begin();
  timeoutRequest.send();
  SC.RunLoop.end();

  // in case nothing works
  checkstop = setTimeout(function() {
    ok(false, 'timeout did not fire at all');
    window.start();
  }, 500);
});

test("Test Multiple listeners per single status response", function() {
  var numResponses = 0;
  var response;

  expect(8);

  // sanity check
  equals(SC.Request.manager.inflight.length,0,"there should be no inflight requests");

  request.notify(200, this, function(response) {
    numResponses++;
    ok(true, "Received a response on first listener");
  });

  request.notify(200, this, function(response) {
    numResponses++;
    ok(true, "Received a response on second listener");
  });

  setTimeout(function() {
    equals(SC.Request.manager.inflight.length,0,"there should be no inflight requests after the timeout");
    equals(numResponses, 2, "got two notifications");
    if (numResponses === 2) { window.start(); }
  }, ((test_timeout*5) - 500) );

  // phantomjs (used in integration tests) needs a veeeery long timeout, just for this test
  stop(test_timeout*5); // stops the test runner - wait for response

  response = request.send();
  ok(response !== null, 'request.send() should return a response object');
  ok(response.get('status')<0, 'response should still not have a return code since this should be async');
  equals(SC.Request.manager.inflight.length,1,"there should be 1 inflight request after send()");
});


/**
  There was a short-lived bug where the additional Arguments passed to notify()
  were being dropped because the slice on 'arguments' was happening after they
  had already been adjusted.
*/
test("Multiple arguments passed to notify()", function() {
  var response;

  // sanity check
  equals(SC.Request.manager.inflight.length,0,"there should be no inflight requests");

  request.notify(this, function(response, a, b, c) {
    equals(a, 'a', "Listener called with argument 'a'");
    equals(b, 'b', "Listener called with argument 'b'");
    equals(c, 'c', "Listener called with argument 'c'");
  }, 'a', 'b', 'c');

  request.notify(200, this, function(response, a, b, c) {
    equals(a, 'a', "Listener called with argument 'a'");
    equals(b, 'b', "Listener called with argument 'b'");
    equals(c, 'c', "Listener called with argument 'c'");

    window.start();
  }, 'a', 'b', 'c');

  stop(test_timeout); // stops the test runner - wait for response

  response = request.send();
});


test("Test event listeners on successful request.", function() {
  var abort = false,
    error = false,
    load = false,
    loadend = false,
    loadstart = false,
    progress = false,
    response,
    status,
    timeout = false;

  request.notify("loadstart", this, function(evt) {
    loadstart = true;
  });

  request.notify("progress", this, function(evt) {
    progress = true;
  });

  request.notify("load", this, function(evt) {
    load = true;
  });

  request.notify("loadend", this, function(evt) {
    loadend = true;
  });

  request.notify(200, this, function(response) {
    status = response.status;

    if (window.ProgressEvent) {
      ok(loadstart, "Received a loadstart event.");
      ok(progress, "Received a progress event.");
      ok(load, "Received a load event.");
      ok(loadend, "Received a loadend event.");
    }
    ok(!abort, "Did not receive an abort event.");
    ok(!error, "Did not receive an error event.");
    ok(!timeout, "Did not receive a timeout event.");
    equals(status, 200, "Received a response with status 200.");

    window.start();
  });

  stop(test_timeout); // stops the test runner - wait for response

  response = request.send();
});

if (window.ProgressEvent) {
  test("Test event listeners on aborted request.", function() {
    var abort = false,
      error = false,
      load = false,
      loadend = false,
      loadstart = false,
      progress = false,
      response,
      status,
      timeout = false;

    request.notify("loadstart", this, function(evt) {
      loadstart = true;
    });

    request.notify("abort", this, function(evt) {
      abort = true;
    });

    request.notify("progress", this, function(evt) {
      progress = true;

      // Cancel it before it completes.
      response.cancel();
    });

    request.notify("loadend", this, function(evt) {
      loadend = true;

      ok(loadstart, "Received a loadstart event.");
      ok(progress, "Received a progress event.");
      ok(abort, "Received an abort event.");
      ok(!load, "Did not receive a load event.");
      ok(loadend, "Received a loadend event.");
      ok(!error, "Did not receive an error event.");
      ok(!timeout, "Did not receive a timeout event.");
      equals(status, undefined, "Did not receive a status notification.");

      window.start();
    });

    stop(test_timeout); // stops the test runner - wait for response

    response = request.send();
  });
}

test("Test upload event listeners on successful request.", function() {
  var abort = false,
    body = {},
    error = false,
    load = false,
    loadend = false,
    loadstart = false,
    progress = false,
    response,
    status,
    timeout = false;

  // Use a POST request
  request = SC.Request.postUrl('/');

  request.notify("upload.loadstart", this, function(evt) {
    loadstart = true;
  });

  request.notify("upload.progress", this, function(evt) {
    progress = true;
  });

  request.notify("upload.load", this, function(evt) {
    load = true;
  });

  request.notify("upload.loadend", this, function(evt) {
    loadend = true;
  });

  request.notify(200, this, function(response) {
    status = response.status;

    if (window.ProgressEvent) {
      ok(loadstart, "Received a loadstart event.");
      ok(progress, "Received a progress event.");
      ok(load, "Received a load event.");
      ok(loadend, "Received a loadend event.");
    }
    ok(!abort, "Did not receive an abort event.");
    ok(!error, "Did not receive an error event.");
    ok(!timeout, "Did not receive a timeout event.");
    equals(status, 200, "Received a response with status 200.");

    window.start();
  });

  // Make a significant body object.
  // It looks that Firefox is not sending the progress event if the request is too small
  var i;
  for (i = 200000; i >= 0; i--) {
    body['k' + i] = 'v' + i;
  }

  stop(test_timeout); // stops the test runner - wait for response

  response = request.send(JSON.stringify(body));
});


test("Test manager.cancelAll.", function() {
  var manager = SC.Request.manager, max = manager.get('maxRequests');
  // Make sure we're clear.
  SC.Request.manager.cancelAll();

  // Get a copy of the previous arrays, since they're overwritten on clear.
  var inflight = manager.get('inflight');
  var pending = manager.get('pending');

  // Generate > 6 requests
  for( var i = 0; i < max * 2; i++) {
    SC.Request.getUrl('/').send();
  }

  equals(inflight.get('length'), max, "There must be %@ inflight requests".fmt(max));
  equals(pending.get('length'), max, "There must be %@ pending requests".fmt(max));

  SC.Request.manager.cancelAll();

  // Demonstrates memory pointer matches
  equals(inflight, manager.getPath('inflight'), "Arrays must be identical");
  equals(pending, manager.getPath('pending'), "Arrays must be identical");

  // Demonstrates that all previous requests have been cleared.
  equals(inflight.get('length'), 0, "There must be 0 inflight requests in the old array".fmt(max));
  equals(pending.get('length'), 0, "There must be 0 pending requests in the old array".fmt(max));

  // Demonstrates that the manager doesn't know about any requests.
  equals(manager.getPath('inflight.length'), 0, "There must be 0 inflight requests".fmt(max));
  equals(manager.getPath('pending.length'), 0, "There must be 0 pending requests".fmt(max));
});
