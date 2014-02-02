// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module, test, start, stop, expect, ok, equals*/


module("Object:invokeOnce()");

test("should invoke function using invokeLater after specified time and pass in extra arguments", function() {
  stop(2000);

  SC.RunLoop.begin();
  var o = SC.Object.create({
    stopped: YES,

    method: function(a, b, c) {
      equals(a, 'a', "Argument 'a' passed");
      equals(b, 'b', "Argument 'b' passed");
      equals(c, 'c', "Argument 'c' passed");

      start();
    }
  });
  o.invokeLater('method', 200, 'a', 'b', 'c');
  SC.RunLoop.end();
});

test("should invoke function once multiple times using invokeLater after specified time", function() {
  stop(2000);
  expect(3);

  SC.RunLoop.begin();
  var o = SC.Object.create({
    stopped: YES,

    method: function() {
      ok(true, 'method called');

      if (this.stopped) {
        this.stopped = NO;
        // Continue on in a short moment.  Before the test times out, but after
        // enough time for a second call to method to possibly come in.
        setTimeout(function() {
          start();
        }, 100);
      }
    }
  });
  o.invokeLater('method', 200);
  o.invokeLater('method', 200);
  o.invokeLater('method', 200);
  SC.RunLoop.end();
});



module("Object:invokeOnceLater()");

test("should invoke function using invokeOnceLater after specified time and pass in extra arguments", function() {
  stop(2000);

  SC.RunLoop.begin();
  var o = SC.Object.create({
    stopped: YES,

    method: function(a, b, c) {
      equals(a, 'a', "Argument 'a' passed");
      equals(b, 'b', "Argument 'b' passed");
      equals(c, 'c', "Argument 'c' passed");

      start();
    }
  });
  o.invokeOnceLater('method', 200, 'a', 'b', 'c');
  SC.RunLoop.end();
});

test("should invoke function once using invokeOnceLater after specified time", function() {
  stop(2000);
  expect(1);

  SC.RunLoop.begin();
  var o = SC.Object.create({
    stopped: YES,

    method: function() {
      ok(true, 'method called');

      if (this.stopped) {
        this.stopped = NO;
        // Continue on in a short moment.  Before the test times out, but after
        // enough time for a second call to method to possibly come in.
        setTimeout(function() {
          start();
        }, 100);
      }
    }
  });
  o.invokeOnceLater('method', 200);
  o.invokeOnceLater('method', 200);
  o.invokeOnceLater('method', 200);
  SC.RunLoop.end();
});
