// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module, test, ok, equals*/
var containerView,
  pane;

module("SC.ContainerView Methods", {
  setup: function () {
    SC.run(function () {

      containerView = SC.ContainerView.create({
        nowShowing: null
      });

      pane = SC.Pane.create({
        layout: { width: 200, height: 200, left: 0, top: 0 },
        childViews: [containerView]
      }).append();
    });

    SC.run(function () {
      containerView.awake();
    });
  },

  teardown: function () {
    pane.remove();
    containerView = pane = null;
  }
});

/**
  There was a regression where destroying a ContainerView that had never had
  a nowShowing view set would throw an exception.
  */
test("Test destroy method.", function () {
  try {
    containerView.destroy();
    ok(true, "ContainerView.prototype.destroy should not fail to work if the ContainerView has no view showing.");
  } catch (ex) {
    ok(false, "ContainerView.prototype.destroy should not fail to work if the ContainerView has no view showing.  Ex: %@".fmt(ex));
  }
});
