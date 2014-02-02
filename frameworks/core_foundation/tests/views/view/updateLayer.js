// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

// NOTE: This file tests both updateLayer() and the related methods that
// will trigger it.

// ..........................................................
// TEST: updateLayer()
//
module("SC.View#updateLayer");

test("invokes applyAttributesToContext() and then updates layer element", function() {
  var layer = document.createElement('div');

  var times = 0;
  var view = SC.View.create({
    applyAttributesToContext: function() {
      times++;
      this.$().addClass('did-update-' + times);
    }
  });
  view.createLayer();
  view.updateLayer(true);
  ok(view.$().attr('class').indexOf('did-update-2')>=0, 'has class name added by render()');

  // Clean up.
  layer = null;
  view.destroy();
});

// ..........................................................
// TEST: updateLayerIfNeeded()
//
var view, callCount ;
module("SC.View#updateLayerIfNeeded", {
  setup: function() {
    view = SC.View.create({
      isVisible: false,
      _executeDoUpdateContent: function() {
        callCount++;
      }
    });
    callCount = 0 ;

    view.createLayer();
    view._doAttach(document.body);
  },

  teardown: function () {
    // Clean up.
    view.destroy();
    view = null;
  }

});

test("does not call _executeDoUpdateContent if not in shown state", function() {
  view.updateLayerIfNeeded();
  equals(callCount, 0, '_executeDoUpdateContent did NOT run');
});

test("does call _executeDoUpdateContent if in shown state", function() {
  view.set('isVisible', true);
  equals(view.get('isVisibleInWindow'), YES, 'precond - isVisibleInWindow');

  view.updateLayerIfNeeded();
  ok(callCount > 0, '_executeDoUpdateContent() did run');
});

test("returns receiver", function() {
  equals(view.updateLayerIfNeeded(), view, 'returns receiver');
});

test("only runs _executeDoUpdateContent once if called multiple times (since layerNeedsUpdate is set to NO)", function() {
  callCount = 0;
  view.set('isVisible', true);
  SC.run(function () {
    view.displayDidChange().displayDidChange().displayDidChange();
  });
  equals(callCount, 1, '_executeDoUpdateContent() called only once');
});
