// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module, test,  equals,  ok */

var parent, view, child;

/** Test the SC.View states. */
module("SC.View#enabledState", {

  setup: function () {
    child = SC.View.create();
    view = SC.View.create({ childViews: [child] });
    parent = SC.View.create({ childViews: [view] });
  },

  teardown: function () {
    parent.destroy();
    parent = view = child = null;
  }

});

/**
  Test the initial state.
  */
test("Test initial states.", function () {
  // Test expected state of the views.
  equals(parent.enabledState, SC.CoreView.ENABLED, "A regular parent view should be in the state");
  equals(view.enabledState, SC.CoreView.ENABLED, "A regular view should be in the state");
  equals(child.enabledState, SC.CoreView.ENABLED, "A regular child view should be in the state");
  ok(parent.get('isEnabled'), "isEnabled should be true");
  ok(parent.get('isEnabledInPane'), "isEnabledInPane should be true");
  ok(view.get('isEnabled'), "isEnabled should be true");
  ok(view.get('isEnabledInPane'), "isEnabledInPane should be true");
  ok(child.get('isEnabled'), "isEnabled should be true");
  ok(child.get('isEnabledInPane'), "isEnabledInPane should be true");
});

test("Test initial disabled states.", function () {
  var newChild = SC.View.create({}),
    newView = SC.View.create({ isEnabled: false, childViews: [newChild] }),
    newParent;

  equals(newView.enabledState, SC.CoreView.DISABLED, "A disabled on creation view should be in the state");
  equals(newChild.enabledState, SC.CoreView.DISABLED_BY_PARENT, "A regular child view of disabled on creation parent should be in the state");

  newParent = SC.View.create({ isEnabled: false, childViews: [newView] });

  equals(newParent.enabledState, SC.CoreView.DISABLED, "A disabled on creation parent view should be in the state");
  equals(newView.enabledState, SC.CoreView.DISABLED_AND_BY_PARENT, "A disabled on creation view of disabled on creation parent should be in the state");
  equals(newChild.enabledState, SC.CoreView.DISABLED_BY_PARENT, "A regular child view of disabled on creation parent should be in the state");

  newParent.destroy();
  newView.destroy();
  newChild.destroy();
});

/**
  Test changing isEnabled to false on the child.
  */
test("Test toggling isEnabled on child.", function () {
  SC.run(function () {
    child.set('isEnabled', false);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.ENABLED, "A regular parent view should be in the state");
    equals(view.enabledState, SC.CoreView.ENABLED, "A regular view should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED, "A disabled child view should be in the state");
    ok(parent.get('isEnabled'), "isEnabled should be true");
    ok(parent.get('isEnabledInPane'), "isEnabledInPane should be true");
    ok(view.get('isEnabled'), "isEnabled should be true");
    ok(view.get('isEnabledInPane'), "isEnabledInPane should be true");
    ok(!child.get('isEnabled'), "isEnabled should be false");
    ok(!child.get('isEnabledInPane'), "isEnabledInPane should be false");
  });
});

/**
  Test changing isEnabled to false on the view.
  */
test("Test toggling isEnabled on view.", function () {
  SC.run(function () {
    view.set('isEnabled', false);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.ENABLED, "A regular parent view should be in the state");
    equals(view.enabledState, SC.CoreView.DISABLED, "A disabled view should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED_BY_PARENT, "A regular child view with disabled ancestor should be in the state");
    ok(parent.get('isEnabled'), "isEnabled should be true");
    ok(parent.get('isEnabledInPane'), "isEnabledInPane should be true");
    ok(!view.get('isEnabled'), "isEnabled should be false");
    ok(!view.get('isEnabledInPane'), "isEnabledInPane should be false");
    ok(child.get('isEnabled'), "isEnabled should be true");
    ok(!child.get('isEnabledInPane'), "isEnabledInPane should be false");
  });

  SC.run(function () {
    child.set('isEnabled', false);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.ENABLED, "A regular parent view should be in the state");
    equals(view.enabledState, SC.CoreView.DISABLED, "A disabled view should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED_AND_BY_PARENT, "A disabled child view with disabled ancestor should be in the state");
    ok(parent.get('isEnabled'), "isEnabled should be true");
    ok(parent.get('isEnabledInPane'), "isEnabledInPane should be true");
    ok(!view.get('isEnabled'), "isEnabled should be false");
    ok(!view.get('isEnabledInPane'), "isEnabledInPane should be false");
    ok(!child.get('isEnabled'), "isEnabled should be true");
    ok(!child.get('isEnabledInPane'), "isEnabledInPane should be false");
  });

  SC.run(function () {
    view.set('isEnabled', true);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.ENABLED, "A regular parent view should be in the state");
    equals(view.enabledState, SC.CoreView.ENABLED, "A regular view should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED, "A disabled child view should be in the state");
    ok(parent.get('isEnabled'), "isEnabled should be true");
    ok(parent.get('isEnabledInPane'), "isEnabledInPane should be true");
    ok(view.get('isEnabled'), "isEnabled should be false");
    ok(view.get('isEnabledInPane'), "isEnabledInPane should be false");
    ok(!child.get('isEnabled'), "isEnabled should be true");
    ok(!child.get('isEnabledInPane'), "isEnabledInPane should be false");
  });
});

/**
  Test changing isEnabled to false on the view.
  */
test("Test toggling isEnabled on parent.", function () {
  SC.run(function () {
    parent.set('isEnabled', false);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.DISABLED, "A disabled parent view should be in the state");
    equals(view.enabledState, SC.CoreView.DISABLED_BY_PARENT, "A regular view with disabled parent should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED_BY_PARENT, "A regular child view with disabled ancestor should be in the state");
    ok(!parent.get('isEnabled'), "disabled parent isEnabled should be false");
    ok(!parent.get('isEnabledInPane'), "disabled parent isEnabledInPane should be false");
    ok(view.get('isEnabled'), "view isEnabled should be true");
    ok(!view.get('isEnabledInPane'), "view isEnabledInPane should be false");
    ok(child.get('isEnabled'), "child isEnabled should be true");
    ok(!child.get('isEnabledInPane'), "child isEnabledInPane should be false");
  });

  SC.run(function () {
    child.set('isEnabled', false);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.DISABLED, "A disabled parent view should be in the state");
    equals(view.enabledState, SC.CoreView.DISABLED_BY_PARENT, "A regular view with disabled parent should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED_AND_BY_PARENT, "A disabled child view with disabled ancestor should be in the state");
    ok(!parent.get('isEnabled'), "isEnabled should be false");
    ok(!parent.get('isEnabledInPane'), "isEnabledInPane should be false");
    ok(view.get('isEnabled'), "view isEnabled should be true");
    ok(!view.get('isEnabledInPane'), "view isEnabledInPane should be false");
    ok(!child.get('isEnabled'), "disabled child isEnabled should be false");
    ok(!child.get('isEnabledInPane'), "disabled child isEnabledInPane should be false");
  });

  SC.run(function () {
    parent.set('isEnabled', true);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.ENABLED, "A regular parent view should be in the state");
    equals(view.enabledState, SC.CoreView.ENABLED, "A regular view should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED, "A disabled child view should be in the state");
    ok(parent.get('isEnabled'), "isEnabled should be true");
    ok(parent.get('isEnabledInPane'), "isEnabledInPane should be true");
    ok(view.get('isEnabled'), "isEnabled should be true");
    ok(view.get('isEnabledInPane'), "isEnabledInPane should be true");
    ok(!child.get('isEnabled'), "disabled child isEnabled should be false");
    ok(!child.get('isEnabledInPane'), "disabled child isEnabledInPane should be false");
  });
});

/**
  Test changing isEnabled to false on the view.
  */
test("Test toggling isEnabled on view.", function () {
  SC.run(function () {
    view.set('isEnabled', false);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.ENABLED, "A regular parent view should be in the state");
    equals(view.enabledState, SC.CoreView.DISABLED, "A disabled view should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED_BY_PARENT, "A regular child view with disabled ancestor should be in the state");
    ok(parent.get('isEnabled'), "isEnabled should be true");
    ok(parent.get('isEnabledInPane'), "isEnabledInPane should be true");
    ok(!view.get('isEnabled'), "isEnabled should be false");
    ok(!view.get('isEnabledInPane'), "isEnabledInPane should be false");
    ok(child.get('isEnabled'), "isEnabled should be true");
    ok(!child.get('isEnabledInPane'), "isEnabledInPane should be false");
  });

  SC.run(function () {
    child.set('isEnabled', false);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.ENABLED, "A regular parent view should be in the state");
    equals(view.enabledState, SC.CoreView.DISABLED, "A disabled view should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED_AND_BY_PARENT, "A disabled child view with disabled ancestor should be in the state");
    ok(parent.get('isEnabled'), "isEnabled should be true");
    ok(parent.get('isEnabledInPane'), "isEnabledInPane should be true");
    ok(!view.get('isEnabled'), "isEnabled should be false");
    ok(!view.get('isEnabledInPane'), "isEnabledInPane should be false");
    ok(!child.get('isEnabled'), "isEnabled should be true");
    ok(!child.get('isEnabledInPane'), "isEnabledInPane should be false");
  });

  SC.run(function () {
    view.set('isEnabled', true);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.ENABLED, "A regular parent view should be in the state");
    equals(view.enabledState, SC.CoreView.ENABLED, "A regular view should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED, "A disabled child view should be in the state");
    ok(parent.get('isEnabled'), "isEnabled should be true");
    ok(parent.get('isEnabledInPane'), "isEnabledInPane should be true");
    ok(view.get('isEnabled'), "isEnabled should be false");
    ok(view.get('isEnabledInPane'), "isEnabledInPane should be false");
    ok(!child.get('isEnabled'), "isEnabled should be true");
    ok(!child.get('isEnabledInPane'), "isEnabledInPane should be false");
  });
});

/**
  Test changing isEnabled to false on the view.
  */
test("Test shouldInheritEnabled.", function () {
  SC.run(function () {
    view.set('shouldInheritEnabled', false);
    parent.set('isEnabled', false);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.DISABLED, "A disabled parent view should be in the state");
    equals(view.enabledState, SC.CoreView.ENABLED, "A regular view with shouldInheritEnabled with disabled parent should be in the state");
    equals(child.enabledState, SC.CoreView.ENABLED, "A regular child view should be in the state");
  });

  SC.run(function () {
    view.set('isEnabled', false);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.DISABLED, "A disabled parent view should be in the state");
    equals(view.enabledState, SC.CoreView.DISABLED, "A disabled view with shouldInheritEnabled and disabled parent should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED_BY_PARENT, "A regular child view with disabled ancestor should be in the state");
  });

  SC.run(function () {
    parent.set('isEnabled', true);
  });

  // Test expected state of the views.
  SC.run(function () {
    equals(parent.enabledState, SC.CoreView.ENABLED, "A regular parent view should be in the state");
    equals(view.enabledState, SC.CoreView.DISABLED, "A disabled view should be in the state");
    equals(child.enabledState, SC.CoreView.DISABLED_BY_PARENT, "A regular child view with disabled ancestor should be in the state");
  });
});

test("Test toggling isEnabled adds/removes disabled class.", function () {
  parent.createLayer();
  parent._doAttach(document.body);

  ok(!parent.$().hasClass('disabled'), "A regular parent should not have disabled class.");
  SC.run(function () {
    parent.set('isEnabled', false);
  });

  // Test expected state of the views.
  SC.run(function () {
    ok(parent.$().hasClass('disabled'), "A disabled parent should have disabled class.");
  });

  SC.run(function () {
    parent.set('isEnabled', true);
  });

  // Test expected state of the views.
  SC.run(function () {
    ok(!parent.$().hasClass('disabled'), "A re-enabled parent should not have disabled class.");
  });

  parent._doDetach();
  parent.destroyLayer();
});

test("Test optimized display update.", function () {
  SC.run(function () {
    parent.set('isEnabled', false);
  });

  parent.createLayer();
  parent._doAttach(document.body);

  // Test expected state of the views.
  SC.run(function () {
    ok(parent.$().hasClass('disabled'), "A disabled when attached parent should have disabled class.");
  });

  parent._doDetach();
  parent.destroyLayer();
  parent.createLayer();
  parent._doAttach(document.body);

  SC.run(function () {
    parent.set('isEnabled', true);
  });

  // Test expected state of the views.
  SC.run(function () {
    ok(!parent.$().hasClass('disabled'), "A re-enabled parent should not have disabled class.");
  });

  parent._doDetach();
  parent.destroyLayer();
});

test("initializing with isEnabled: false, should still add the proper class on append", function () {
  var newView = SC.View.create({
    isEnabled: false
  });

  parent.createLayer();
  parent._doAttach(document.body);
  parent.appendChild(newView);

  ok(newView.$().hasClass('disabled'), "An initialized as disabled view should have disabled class on append.");
});
