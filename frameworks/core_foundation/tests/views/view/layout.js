// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, equals, ok */

var view;

/** Test isFixedLayout via isFixedSize and isFixedPosition properties. */
module("SC.View.prototype.isFixedLayout", {

  setup: function () {
    // Create a basic view.
    view = SC.View.create({});
  },

  teardown: function () {
    // Clean up.
    view.destroy();
    view = null;
  }

});

test("Test isFixedSize for various layouts.", function () {
  ok(!view.get('isFixedSize'), "The default layout doesn't correspond to a fixed size.");

  SC.run(function () { view.set('layout', { width: 100 }); });
  ok(!view.get('isFixedSize'), "A width alone doesn't correspond to a fixed size.");

  SC.run(function () { view.set('layout', { height: 100 }); });
  ok(!view.get('isFixedSize'), "A height alone doesn't correspond to a fixed size.");

  SC.run(function () { view.set('layout', { width: 100, height: 100 }); });
  ok(view.get('isFixedSize'), "A width & height corresponds to a fixed size.");
});

test("Test isFixedPosition for various layouts.", function () {
  ok(view.get('isFixedPosition'), "The default layout corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { left: 0 }); });
  ok(view.get('isFixedPosition'), "A left: 0 (implied top, bottom, right) corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { top: 0 }); });
  ok(view.get('isFixedPosition'), "A top: 0 (implied left, bottom, right) corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { left: 0, top: 0 }); });
  ok(view.get('isFixedPosition'), "A left: 0, top: 0 corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { left: 50 }); });
  ok(view.get('isFixedPosition'), "A left: 50 corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { top: 50 }); });
  ok(view.get('isFixedPosition'), "A top: 50 corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { left: 50, top: 50 }); });
  ok(view.get('isFixedPosition'), "A left: 50, top: 50 corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { right: 0 }); });
  ok(view.get('isFixedPosition'), "A right: 0 (implied left) corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { bottom: 0 }); });
  ok(view.get('isFixedPosition'), "A bottom: 0 (implied top) corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { right: 50 }); });
  ok(view.get('isFixedPosition'), "A right: 50 (implied left) corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { bottom: 50 }); });
  ok(view.get('isFixedPosition'), "A bottom: 50 (implied top) corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { width: 100 }); });
  ok(view.get('isFixedPosition'), "A width: 100 (implied left) corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { height: 100 }); });
  ok(view.get('isFixedPosition'), "A height: 100 (implied top) corresponds to a fixed position.");

  SC.run(function () { view.set('layout', { right: 0, width: 100 }); });
  ok(!view.get('isFixedPosition'), "A right: 0, width: 100 (overridden left) doesn't correspond to a fixed position.");

  SC.run(function () { view.set('layout', { bottom: 0, height: 100 }); });
  ok(!view.get('isFixedPosition'), "A bottom: 0, height: 100 (overridden top) doesn't correspond to a fixed position.");

  SC.run(function () { view.set('layout', { centerX: 0, width: 100 }); });
  ok(!view.get('isFixedPosition'), "A centerX: 0, width: 100 (overridden left) doesn't correspond to a fixed position.");

  SC.run(function () { view.set('layout', { centerY: 0, height: 100 }); });
  ok(!view.get('isFixedPosition'), "A centerY: 0, height: 100 (overridden top) doesn't correspond to a fixed position.");

  SC.run(function () { view.set('layout', { left: 0.2 }); });
  ok(!view.get('isFixedPosition'), "A left: 0.2 (percentage left) doesn't correspond to a fixed position.");

  SC.run(function () { view.set('layout', { top: 0.2 }); });
  ok(!view.get('isFixedPosition'), "A top: 0.2 (percentage top) doesn't correspond to a fixed position.");

  SC.run(function () { view.set('layout', { left: SC.LAYOUT_AUTO }); });
  ok(!view.get('isFixedPosition'), "A left: SC.LAYOUT_AUTO (auto left) doesn't correspond to a fixed position.");

  SC.run(function () { view.set('layout', { top: SC.LAYOUT_AUTO }); });
  ok(!view.get('isFixedPosition'), "A top: SC.LAYOUT_AUTO (auto top) doesn't correspond to a fixed position.");
});
