// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global ok, equals, expect, test, module*/


module("SC.Pane - childViews");

test("SC.Pane should not attempt to recompute visibility on child views that do not have visibility support", function () {
  var pane = SC.Pane.create({
    childViews: ['noVisibility'],

    noVisibility: SC.CoreView
  });

  // tomdale insists on slowing down the tests with extra scope chain traversals
  var errored = NO;

  try {
    pane.append();
  } catch (e) {
    errored = YES;
  }

  ok(!errored, "appending a pane with child views without visibility does not result in an error");
  pane.remove();

  // Clean up.
  pane.destroy();
});

test("SC.Pane should only render once when appended.", function () {
  var pane = SC.Pane.create({
    childViews: ['child'],

    paneValue: null,

    render: function () {
      ok(true, 'Render was called once on pane.');
    },

    child: SC.View.extend({
      childValueBinding: SC.Binding.oneWay('.pane.paneValue').transform(
        function (paneValue) {
          equals(paneValue, 'bar', "Bound value should be set once to 'bar'");

          return paneValue;
        }),
      render: function () {
        ok(true, 'Render was called once on child.');
      }
    })
  });

  SC.run(function () {
    pane.append();

    pane.set('paneValue', 'foo');
    pane.set('paneValue', 'bar');
  });

  pane.remove();

  expect(3);

  // Clean up.
  pane.destroy();
});
