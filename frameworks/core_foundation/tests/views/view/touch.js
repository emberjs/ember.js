// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var pane;

module("SC.View#touch", {
  setup: function() {
    SC.run(function() {
     pane = SC.Pane.create({
       layout: { width: 200, height: 200, left: 0, top: 0 },
       childViews: ['outerView'],

       outerView: SC.View.extend({
         childViews: ['innerView'],

         innerView: SC.View.extend({
           layout: { width: 50, height: 50, left: 100, top: 100 }
         })
       })
     }).append();
    });
  },

  teardown: function() {
    pane.remove();
    pane = null;
  }
});

function testTouches (view, left, top, boundary) {
  var frame = view.get('frame');

  // Just outside the touchBoundary
  ok(!view.touchIsInBoundary({ pageX: left - boundary - 1, pageY: top }), '{ pageX: %@, pageY: %@ } is not inside %@'.fmt(left - boundary - 1, top, SC.stringFromRect(view.get('_touchBoundaryFrame'))));

  // Just inside the touchBoundary
  ok(view.touchIsInBoundary({ pageX: left - boundary, pageY: top }), '{ pageX: %@, pageY: %@ } is inside %@'.fmt(left - boundary, top, SC.stringFromRect(view.get('_touchBoundaryFrame'))));

  // Just inside the edge of the view
  ok(view.touchIsInBoundary({ pageX: left + frame.width, pageY: top }), '{ pageX: %@, pageY: %@ } is inside %@'.fmt(left + frame.width, top, SC.stringFromRect(view.get('_touchBoundaryFrame'))));

  // Just inside the touchBoundary
  ok(view.touchIsInBoundary({ pageX: left + frame.width + boundary, pageY: top }), '{ pageX: %@, pageY: %@ } is inside %@'.fmt(left + frame.width + boundary, top, SC.stringFromRect(view.get('_touchBoundaryFrame'))));

  // Just outside the touchBoundary
  ok(!view.touchIsInBoundary({ pageX: left + frame.width + boundary + 1, pageY: top }), '{ pageX: %@, pageY: %@ } is not inside %@'.fmt(left + frame.width + boundary + 1, top, SC.stringFromRect(view.get('_touchBoundaryFrame'))));

  // Just outside the touchBoundary
  ok(!view.touchIsInBoundary({ pageX: left, pageY: top - boundary - 1 }), '{ pageX: %@, pageY: %@ } is not inside %@'.fmt(left, top - boundary - 1, SC.stringFromRect(view.get('_touchBoundaryFrame'))));

  // Just inside the touchBoundary
  ok(view.touchIsInBoundary({ pageX: left, pageY: top - boundary }), '{ pageX: %@, pageY: %@ } is inside %@'.fmt(left, top - boundary, SC.stringFromRect(view.get('_touchBoundaryFrame'))));

  // Just inside the edge of the view
  ok(view.touchIsInBoundary({ pageX: left, pageY: top + frame.height }), '{ pageX: %@, pageY: %@ } is inside %@'.fmt(left, top + frame.height, SC.stringFromRect(view.get('_touchBoundaryFrame'))));

  // Just inside the touchBoundary
  ok(view.touchIsInBoundary({ pageX: left, pageY: top + frame.height + boundary }), '{ pageX: %@, pageY: %@ } is inside %@'.fmt(left, top + frame.height + boundary, SC.stringFromRect(view.get('_touchBoundaryFrame'))));

  // Just outside the touchBoundary
  ok(!view.touchIsInBoundary({ pageX: left, pageY: top + frame.height + boundary + 1 }), '{ pageX: %@, pageY: %@ } is not inside %@'.fmt(left, top + frame.height + boundary + 1, SC.stringFromRect(view.get('_touchBoundaryFrame'))));

}

test("touchIsInBoundary() should return appropriate values", function() {
  var outerView = pane.get('outerView'),
    innerView = outerView.get('innerView');

  testTouches(innerView, 100, 100, 25);

  // Move the inner view
  SC.run(function() {
    innerView.adjust('top', 150);
  });
  testTouches(innerView, 100, 150, 25);

  // Move the outer view
  SC.run(function() {
    outerView.adjust('left', 100);
  });
  testTouches(innerView, 200, 150, 25);

  // Expand the touch boundary
  SC.run(function() {
    innerView.set('touchBoundary', { left: 50, bottom: 50, top: 50, right: 50 });
  });
  testTouches(innerView, 200, 150, 50);

  // Contract the touch boundary
  SC.run(function() {
    innerView.set('touchBoundary', { left: 5, bottom: 5, top: 5, right: 5 });
  });
  testTouches(innerView, 200, 150, 5);
});

test("touchIsInBoundary() should return appropriate values for a newly appended view", function() {
  var outerView = pane.get('outerView'),
    innerView = outerView.get('innerView');

  // Append a view
  var newView = SC.View.create({
    layout: { width: 10, height: 10, left: 50, top: 50 }
  });

  SC.run(function() {
    outerView.appendChild(newView);
  });
  testTouches(newView, 50, 50, 25);
});
