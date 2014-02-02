// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same Q$ htmlbody */

var pane, a, aa ;
module("SC.View#clippingFrame", {
  setup: function() {
    htmlbody('<style> .sc-view { border: 1px blue solid; position: absolute;  overflow: hidden; }</style>');
    SC.RunLoop.begin();
    pane = SC.Pane.design()
      .layout({ top: 0, left: 0, width: 200, height: 200 })
      .childView(SC.View.design()
        .layout({ top: 50, left: 50, width: 100, height: 100 })
        .childView(SC.View.design()
          .layout({ top: 20, left: 20, width: 40, height: 40 })))
      .create();
    pane.append();
    a = pane.childViews[0];
    aa = a.childViews[0];
  },

  teardown: function() {
    pane.remove();
    pane.destroy();
    pane = a = aa = null ;
    SC.RunLoop.end();
    clearHtmlbody();
  }
});

test("clippingFrame === frame w/ 0 offset if not partially hidden", function() {
  var result = pane.get('clippingFrame'), expected = pane.get('frame');
  expected.x = expected.y = 0 ;
  same(result, expected, 'pane');

  result = a.get('clippingFrame'); expected = a.get('frame');
  expected.x = expected.y = 0 ;
  same(result, expected, 'child');

  result = aa.get('clippingFrame'); expected = aa.get('frame');
  expected.x = expected.y = 0 ;
  same(result, expected, 'nested child');
});

test("cuts off top of frame", function() {
  var result, expected;

  a.adjust('top', -50);
  result = a.get('clippingFrame'); expected = a.get('frame');
  expected.x = 0 ; expected.y = 50 ; expected.height = 50 ;
  same(result, expected, 'child');

  result = aa.get('clippingFrame'); expected = aa.get('frame');
  expected.x = 0 ; expected.y = 30 ; expected.height = 10 ;
  same(result, expected, 'nested child');
});

test("cuts off bottom of frame", function() {
  var result, expected;

  a.adjust('top', 150);
  result = a.get('clippingFrame'); expected = a.get('frame');
  expected.x = 0 ; expected.y = 0 ; expected.height = 50 ;
  same(result, expected, 'child');

  result = aa.get('clippingFrame'); expected = aa.get('frame');
  expected.x = 0 ; expected.y = 0 ; expected.height = 30 ;
  same(result, expected, 'nested child');
});

test("cuts off left of frame", function() {
  var result, expected;

  a.adjust('left', -50);
  result = a.get('clippingFrame'); expected = a.get('frame');
  expected.y = 0 ; expected.x = 50 ; expected.width = 50 ;
  same(result, expected, 'child');

  result = aa.get('clippingFrame'); expected = aa.get('frame');
  expected.y = 0 ; expected.x = 30 ; expected.width = 10 ;
  same(result, expected, 'nested child');
});

test("cuts off right of frame", function() {
  var result, expected;

  a.adjust('left', 150);
  result = a.get('clippingFrame'); expected = a.get('frame');
  expected.y = 0 ; expected.x = 0 ; expected.width = 50 ;
  same(result, expected, 'child');

  result = aa.get('clippingFrame'); expected = aa.get('frame');
  expected.y = 0 ; expected.x = 0 ; expected.width = 30 ;
  same(result, expected, 'nested child');
});

test("notifies receiver and each child if parent clipping frame changes", function() {
  var callCount = 0;

  // setup observers
  function observer() { callCount++; }
  a.addObserver('clippingFrame', observer);
  aa.addObserver('clippingFrame', observer);

  // now, adjust layout of child so that clipping frame will change...
  a.adjust('top', -50);

  // IMPORTANT:  If this test fails because the callCount is > 2 it means that
  // when you set the layout, the frame is getting invalidated more than once.
  // This should not happen.  If this is the case, fix the view code so that
  // it does not invalidate frame more than once before you change this
  // number.
  equals(callCount, 2, 'should invoke observer on child and nested child');
});

test("returns 0, 0, W, H if parentView has no clippingFrame", function(){
  a.clippingFrame = null;

  var targetFrame = aa.get('clippingFrame');

  equals(targetFrame.x, 0, "x should be 0");
  equals(targetFrame.y, 0, "y should be 0");
  equals(targetFrame.width, 40, "width should be 40");
  equals(targetFrame.height, 40, "height should be 40");
});
