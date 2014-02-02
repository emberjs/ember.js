// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, equals,ok */

var parentView;

/** Test the SC.View states. */
module("SC.View States", {

  setup: function () {
    parentView = SC.View.create();
  },

  teardown: function () {
    parentView.destroy();
    parentView = null;
  }

});

/**
  Test the state, in particular supported actions.
  */
test("Test unrendered state.", function () {
  var handled,
    view = SC.View.create();

  // Test expected state of the view.
  equals(view.viewState, SC.CoreView.UNRENDERED, "A newly created view should be in the state");
  ok(!view.get('isAttached'), "isAttached should be false");
  ok(!view.get('_isRendered'), "_isRendered should be false");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");

  // _doAttach(document.body)
  // _doDestroyLayer()
  // _doDetach()
  // _doHide()
  // _doRender()
  // _doShow()
  // _doUpdateContent()
  // _doUpdateLayout()

  // UNHANDLED ACTIONS
  handled = view._doShow();
  ok(!handled, "Calling _doShow() should not be handled");
  equals(view.viewState, SC.CoreView.UNRENDERED, "Calling _doShow() doesn't change state");

  handled = view._doAttach(document.body);
  ok(!handled, "Calling _doAttach(document.body) should not be handled");
  equals(view.viewState, SC.CoreView.UNRENDERED, "Calling _doAttach(document.body) doesn't change state");

  handled = view._doDestroyLayer();
  ok(!handled, "Calling _doDestroyLayer() should not be handled");
  equals(view.viewState, SC.CoreView.UNRENDERED, "Calling _doDestroyLayer() doesn't change state");

  handled = view._doDetach();
  ok(!handled, "Calling _doDetach() should not be handled");
  equals(view.viewState, SC.CoreView.UNRENDERED, "Calling _doDetach() doesn't change state");

  SC.run(function () {
    handled = view._doHide();
  });
  ok(!handled, "Calling _doHide() should not be handled");
  equals(view.viewState, SC.CoreView.UNRENDERED, "Calling _doHide() doesn't change state");

  handled = view._doUpdateContent();
  ok(!handled, "Calling _doUpdateContent() should not be handled");
  equals(view.viewState, SC.CoreView.UNRENDERED, "Calling _doUpdateContent() doesn't change state");

  handled = view._doUpdateLayout();
  ok(!handled, "Calling _doUpdateLayout() should not be handled");
  equals(view.viewState, SC.CoreView.UNRENDERED, "Calling _doUpdateLayout() doesn't change state");


  // HANDLED ACTIONS

  handled = view._doRender();
  ok(handled, "Calling _doRender() should be handled");
  equals(view.viewState, SC.CoreView.UNATTACHED, "Calling _doRender() changes state");


  // CLEAN UP
  view.destroy();
});

/**
  Test the state, in particular supported actions.
  */
test("Test unattached state.", function () {
  var handled,
    view = SC.View.create();

  // Test expected state of the view.
  view._doRender();
  equals(view.viewState, SC.CoreView.UNATTACHED, "A newly created view that is rendered should be in the state");
  ok(!view.get('isAttached'), "isAttached should be false");
  ok(view.get('_isRendered'), "_isRendered should be true");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");

  // _doAttach(document.body)
  // _doDestroyLayer()
  // _doDetach()
  // _doHide()
  // _doRender()
  // _doShow()
  // _doUpdateContent()
  // _doUpdateLayout()

  // UNHANDLED ACTIONS
  handled = view._doDetach();
  ok(!handled, "Calling _doDetach() should not be handled");
  equals(view.viewState, SC.CoreView.UNATTACHED, "Calling _doDetach() doesn't change state");

  handled = view._doRender();
  ok(!handled, "Calling _doRender() should not be handled");
  equals(view.viewState, SC.CoreView.UNATTACHED, "Calling _doRender() doesn't change state");


  // HANDLED ACTIONS

  SC.run(function () {
    handled = view._doHide();
  });
  ok(handled, "Calling _doHide() should be handled");
  equals(view.viewState, SC.CoreView.UNATTACHED, "Calling _doHide() doesn't change state");

  handled = view._doShow();
  ok(handled, "Calling _doShow() should be handled");
  equals(view.viewState, SC.CoreView.UNATTACHED, "Calling _doShow() doesn't change state");

  handled = view._doAttach(document.body);
  ok(handled, "Calling _doAttach(document.body) should be handled");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "Calling _doAttach(document.body) changes state");

  // Reset
  view.destroy();
  view = SC.View.create();
  view._doRender();

  handled = view._doDestroyLayer();
  ok(handled, "Calling _doDestroyLayer() should be handled");
  equals(view.viewState, SC.CoreView.UNRENDERED, "Calling _doDestroyLayer() changes state");

  // Reset
  view.destroy();
  view = SC.View.create();
  view._doRender();

  handled = view._doUpdateContent();
  ok(handled, "Calling _doUpdateContent() should be handled");
  equals(view.viewState, SC.CoreView.UNATTACHED, "Calling _doUpdateContent() doesn't change state");

  handled = view._doUpdateLayout();
  ok(handled, "Calling _doUpdateLayout() should be handled");
  equals(view.viewState, SC.CoreView.UNATTACHED, "Calling _doUpdateLayout() doesn't change state");

  // Reset
  view.destroy();
  view = SC.View.create();
  view._doRender();

  handled = view._doAttach(document.body);
  ok(handled, "Calling _doAttach(document.body) with unrendered orphan parentView should be handled");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "Calling _doAttach(document.body) changes state");


  // CLEAN UP
  view.destroy();
});


/**
  Test the state, in particular supported actions.
  */
test("Test attached_shown state.", function () {
  var handled,
    view = SC.View.create();

  // Test expected state of the view.
  view._doRender();
  view._doAttach(document.body);
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "A newly created orphan view that is rendered and attached should be in the state");
  ok(view.get('isAttached'), "isAttached should be true");
  ok(view.get('_isRendered'), "_isRendered should be true");
  ok(view.get('isVisibleInWindow'), "isVisibleInWindow should be true");

  // _doAttach(document.body)
  // _doDestroyLayer()
  // _doDetach()
  // _doHide()
  // _doRender()
  // _doShow()
  // _doUpdateContent()
  // _doUpdateLayout()


  // UNHANDLED ACTIONS
  handled = view._doAttach(document.body);
  ok(!handled, "Calling _doAttach(document.body) should not be handled");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "Calling _doAttach(document.body) doesn't change state");

  handled = view._doDestroyLayer();
  ok(!handled, "Calling _doDestroyLayer() should not be handled");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "Calling _doDestroyLayer() doesn't change state");

  handled = view._doRender();
  ok(!handled, "Calling _doRender() should not be handled");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "Calling _doRender() doesn't change state");

  handled = view._doShow();
  ok(!handled, "Calling _doShow() should not be handled");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "Calling _doShow() doesn't change state");


  // HANDLED ACTIONS

  handled = view._doUpdateContent();
  ok(handled, "Calling _doUpdateContent() should be handled");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "Calling _doUpdateContent() doesn't change state");

  handled = view._doUpdateLayout();
  ok(handled, "Calling _doUpdateLayout() should be handled");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "Calling _doUpdateLayout() doesn't change state");

  handled = view._doDetach();
  ok(handled, "Calling _doDetach() should be handled");
  equals(view.viewState, SC.CoreView.UNATTACHED, "Calling _doDetach() changes state");

  // Reset
  view.destroy();
  view = SC.View.create();
  view._doRender();
  view._doAttach(document.body);

  SC.run(function () {
    handled = view._doHide();
  });
  ok(handled, "Calling _doHide() should be handled");
  equals(view.viewState, SC.CoreView.ATTACHED_HIDDEN, "Calling _doHide() changes state");


  // CLEAN UP
  view.destroy();
});


test("Calling destroy layer, clears the layer from all child views.",  function () {
  var child = SC.View.create(),
    view = SC.View.create({ childViews: [child] });

  view._doAdopt(parentView);
  parentView._doRender();

  ok(parentView.get('layer'), "The parentView should have a reference to the layer.");
  ok(view.get('layer'), "The view should have a reference to the layer.");
  ok(child.get('layer'), "The child should have a reference to the layer.");

  parentView._doDestroyLayer();
  equals(parentView.get('layer'), null, "The parentView should not have a reference to the layer.");
  equals(view.get('layer'), null, "The view should not have a reference to the layer.");
  equals(child.get('layer'), null, "The child should not have a reference to the layer.");

  // CLEAN UP
  view.destroy();
});

/** Test the SC.View state propagation to child views. */
module("SC.View Adoption", {

  setup: function () {
    parentView = SC.Pane.create();
  },

  teardown: function () {
    parentView.destroy();
    parentView = null;
  }

});


test("Test adding a child brings that child to the same state as the parentView.", function () {
  var child = SC.View.create(),
    view = SC.View.create({ childViews: [child] });

  // Test expected state of the view.
  view._doAdopt(parentView);
  equals(parentView.viewState, SC.CoreView.UNRENDERED, "A newly created parentView should be in the state");
  equals(view.viewState, SC.CoreView.UNRENDERED, "A newly created child view of unrendered parentView should be in the state");
  equals(child.viewState, SC.CoreView.UNRENDERED, "A newly created child view of unrendered parentView's child view should be in the state");
  ok(!view.get('_isRendered'), "_isRendered should be false");
  ok(!view.get('isAttached'), "isAttached should be false");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");

  // Render the view.
  view._doRender();
  equals(view.viewState, SC.CoreView.UNATTACHED, "A rendered child view of unrendered parentView should be in the state");
  equals(child.viewState, SC.CoreView.UNATTACHED_BY_PARENT, "A rendered child view of unrendered parentView's child view should be in the state");
  ok(view.get('_isRendered'), "_isRendered should be true");
  ok(!view.get('isAttached'), "isAttached should be false");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");

  // Attach the view.
  view._doAttach(document.body);
  equals(view.viewState, SC.CoreView.UNATTACHED_BY_PARENT, "An attached child view of unrendered parentView should be in the state");
  equals(child.viewState, SC.CoreView.UNATTACHED_BY_PARENT, "An attached child view of unrendered parentView's child view should be in the state");
  ok(view.get('_isRendered'), "_isRendered should be true");
  ok(!view.get('isAttached'), "isAttached should be false");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");

  // Reset
  view.destroy();
  child = SC.View.create();
  view = SC.View.create({ childViews: [child] });

  parentView._doRender();
  view._doAdopt(parentView);
  equals(parentView.viewState, SC.CoreView.UNATTACHED, "A newly created parentView that is rendered should be in the state");
  equals(view.viewState, SC.CoreView.UNATTACHED_BY_PARENT, "A newly created child view of unattached parentView should be in the state");
  equals(child.viewState, SC.CoreView.UNATTACHED_BY_PARENT, "A newly created child view of unattached parentView's child view should be in the state");
  ok(view.get('_isRendered'), "_isRendered should be true");
  ok(!view.get('isAttached'), "isAttached should be false");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");

  // Attach the view.
  view._doAttach(document.body);
  equals(view.viewState, SC.CoreView.UNATTACHED_BY_PARENT, "An attached child view of unattached parentView should be in the state");
  equals(child.viewState, SC.CoreView.UNATTACHED_BY_PARENT, "An attached child view of unattached parentView's child view should be in the state");
  ok(view.get('_isRendered'), "_isRendered should be true");
  ok(!view.get('isAttached'), "isAttached should be false");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");

  // Reset
  view.destroy();
  child = SC.View.create();
  view = SC.View.create({ childViews: [child] });

  parentView._doAttach(document.body);
  view._doAdopt(parentView);
  equals(parentView.viewState, SC.CoreView.ATTACHED_SHOWN, "A newly created parentView that is attached should be in the state");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "A newly created child view of attached parentView should be in the state");
  equals(child.viewState, SC.CoreView.ATTACHED_SHOWN, "A child of newly created view of attached parentView should be in the state");
  ok(view.get('_isRendered'), "_isRendered should be true");
  ok(view.get('isAttached'), "isAttached should be true");
  ok(view.get('isVisibleInWindow'), "isVisibleInWindow should be true");


  // CLEAN UP
  view.destroy();
});


test("Test showing and hiding parentView updates child views.", function () {
  var handled,
    child = SC.View.create(),
    view = SC.View.create({ childViews: [child] });

  // Test expected state of the view.
  parentView._doRender();
  parentView._doAttach(document.body);
  view._doAdopt(parentView);
  equals(parentView.viewState, SC.CoreView.ATTACHED_SHOWN, "A newly created parentView that is attached should be in the state");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "A newly created child view of unattached parentView should be in the state");
  equals(child.viewState, SC.CoreView.ATTACHED_SHOWN, "A newly created child view of unattached parentView's child view should be in the state");
  ok(view.get('isVisibleInWindow'), "isVisibleInWindow should be true");

  // Hide the parentView.
  SC.run(function () {
    parentView._doHide();
  });
  equals(parentView.viewState, SC.CoreView.ATTACHED_HIDDEN, "A hidden parentView that is attached should be in the state");
  equals(view.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "A child view of attached_hidden parentView should be in the state");
  equals(child.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "A child view of attached_hidden parentView's child view should be in the state");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");

  // Show the parentView/hide the view.
  handled = parentView._doShow();
  ok(handled, "Calling _doShow() on parentView should be handled");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "Calling _doShow() on parentView changes state on view.");
  equals(child.viewState, SC.CoreView.ATTACHED_SHOWN, "Calling _doShow() on parentView changes state on child");

  SC.run(function () {
    handled = view._doHide();
  });
  ok(handled, "Calling _doHide() should be handled");
  equals(view.viewState, SC.CoreView.ATTACHED_HIDDEN, "Calling _doHide() on view changes state on view");
  equals(child.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "Calling _doHide() on view changes state on child");

  // Reset
  SC.run(function () {
    parentView._doHide();
  });
  view.destroy();
  child = SC.View.create();
  view = SC.View.create({ childViews: [child] });
  view._doAdopt(parentView);

  // Add child to already hidden parentView.
  equals(view.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "A child view of attached_hidden parentView should be in the state");
  equals(child.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "A child view of attached_hidden parentView's child view should be in the state");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");

  // Reset
  parentView.destroy();
  parentView = SC.View.create();
  parentView._doRender();
  child = SC.View.create();
  view = SC.View.create({ childViews: [child] });
  view._doAdopt(parentView);

  // Attach a parentView with children
  equals(view.viewState, SC.CoreView.UNATTACHED_BY_PARENT, "A child view of unattached parentView should be in the state");
  equals(child.viewState, SC.CoreView.UNATTACHED_BY_PARENT, "A child view of unattached parentView's child view should be in the state");
  parentView._doAttach(document.body);
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "A child view of attached_shown parentView should be in the state");
  equals(child.viewState, SC.CoreView.ATTACHED_SHOWN, "A child view of attached_shown parentView's child view should be in the state");

  // CLEAN UP
  view.destroy();
});

test("Test hiding with transitionHide", function () {
  var child = SC.View.create(),
    transitionHide = { run: function () {} },
    view = SC.View.create({ childViews: [child] });

  // Set up.
  parentView._doRender();
  parentView._doAttach(document.body);
  view._doAdopt(parentView);

  // Hide the parentView with transitionHide
  parentView.set('transitionHide', transitionHide);
  SC.run(function () {
    parentView._doHide();
  });
  ok(parentView.get('isVisibleInWindow'), "isVisibleInWindow of parentView should be false");
  ok(view.get('isVisibleInWindow'), "isVisibleInWindow should be true");
  ok(child.get('isVisibleInWindow'), "isVisibleInWindow of child should be true");

  SC.run(function () {
    parentView.didTransitionOut();
  });
  ok(!parentView.get('isVisibleInWindow'), "isVisibleInWindow of parentView should be false after didTransitionOut");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false after didTransitionOut");
  ok(!child.get('isVisibleInWindow'), "isVisibleInWindow of child should be false after didTransitionOut");

  // CLEAN UP
  view.destroy();
});

test("Adjusting unrelated layout property (not specified in transition's layoutProperties) during transition.", function() {
  var transition = {
    layoutProperties: ['opacity'],
    run: function (view) {
      view.adjust('opacity', 0);
      view.invokeNext(view.didTransitionIn);
    }
  }
  var view = SC.View.create({
    transitionIn: transition,
    layout: { height: 40 },
    didTransitionIn: function() {
      sc_super();
      equals(this.getPath('layout.height'), 30, "height adjusted during an opacity transition is retained after the transition is complete");
      start();
    }
  });

  SC.run(function() {
    view._doRender();
    view._doAttach(document.body);
    equals(view.getPath('layout.height'), 40, 'PRELIM: View height starts at 40');
    equals(view.get('viewState'), SC.View.ATTACHED_BUILDING_IN, "PRELIM: View is building in");
    view.adjust('height', 30);
    stop(250);
  });

});

/** isVisible */
var child, view;
module("SC.View isVisible integration with shown and hidden state", {

  setup: function () {
    SC.run(function () {
      parentView = SC.View.create();
      parentView._doRender();
      parentView._doAttach(document.body);

      child = SC.View.create(),
      view = SC.View.create({
        // STUB: _executeDoUpdateContent
        _executeDoUpdateContent: CoreTest.stub('_executeDoUpdateContent', SC.CoreView.prototype._executeDoUpdateContent),
        // STUB: _doUpdateVisibleStyle
        _doUpdateVisibleStyle: CoreTest.stub('_doUpdateVisibleStyle', SC.CoreView.prototype._doUpdateVisibleStyle),

        childViews: [child],
        displayProperties: ['foo'],
        foo: false
      });
    });
  },

  teardown: function () {
    view.destroy();
    parentView.destroy();
    parentView = null;
  }

});

test("Test showing and hiding a hidden view in same run loop should not update visibility or content.", function () {
  view._doAdopt(parentView);

  SC.run(function () {
    view.set('isVisible', false);
  });

  view._executeDoUpdateContent.expect(0);
  view._doUpdateVisibleStyle.expect(1);

  // Hide the view using isVisible.
  SC.run(function () {
    view.set('foo', true);
    equals(view.viewState, SC.CoreView.ATTACHED_HIDDEN, "The view should be in the state");
    equals(child.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "The child view should be in the state");

    ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");
    ok(!child.get('isVisibleInWindow'), "isVisibleInWindow of child should be false");

    view.set('isVisible', true);
    equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "The view should now be in the state");
    equals(child.viewState, SC.CoreView.ATTACHED_SHOWN, "The child view should now be in the state");

    ok(view.get('isVisibleInWindow'), "isVisibleInWindow should be true");
    ok(child.get('isVisibleInWindow'), "isVisibleInWindow of child should be true");

    view.set('isVisible', false);
  });

  view._executeDoUpdateContent.expect(0);
  view._doUpdateVisibleStyle.expect(3);
});

test("Test hiding and showing a shown view in same run loop should not update visibility.", function () {
  view._doAdopt(parentView);

  // Hide the view using isVisible.
  SC.run(function () {
    view.set('foo', true);
    view.set('isVisible', false);
    equals(view.viewState, SC.CoreView.ATTACHED_HIDDEN, "The view should be in the state");
    equals(child.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "The child view should be in the state");

    ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");
    ok(!child.get('isVisibleInWindow'), "isVisibleInWindow of child should be false");

    view.set('isVisible', true);
    equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "The view should be in the state");
    equals(child.viewState, SC.CoreView.ATTACHED_SHOWN, "The child view should be in the state");

    ok(view.get('isVisibleInWindow'), "isVisibleInWindow should be true");
    ok(child.get('isVisibleInWindow'), "isVisibleInWindow of child should be true");
  });

  view._executeDoUpdateContent.expect(1);
  view._doUpdateVisibleStyle.expect(2);
});


test("Test showing and hiding a hiding view in same run loop should not update visibility or content.", function () {
  var transitionHide = { run: function () {} };

  view._doAdopt(parentView);

  view.set('transitionHide', transitionHide);

  SC.run(function () {
    view.set('foo', true);
    view.set('isVisible', false);
  });

  // Hide the view using isVisible.
  SC.run(function () {
    equals(view.viewState, SC.CoreView.ATTACHED_HIDING, "The view should be in the state");
    equals(child.viewState, SC.CoreView.ATTACHED_SHOWN, "The child view should be in the state");

    ok(view.get('isVisibleInWindow'), "isVisibleInWindow should be true");
    ok(child.get('isVisibleInWindow'), "isVisibleInWindow of child should be true");

    view.set('isVisible', true);
    equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "The view should be in the state");
    equals(child.viewState, SC.CoreView.ATTACHED_SHOWN, "The child view should be in the state");

    ok(view.get('isVisibleInWindow'), "isVisibleInWindow should be true");
    ok(child.get('isVisibleInWindow'), "isVisibleInWindow of child should be true");

    view.set('isVisible', false);
  });

  view._executeDoUpdateContent.expect(1);
  view._doUpdateVisibleStyle.expect(0);
});

test("Test hiding and showing a showing view in same run loop should not update visibility.", function () {
  var transitionShow = { run: function () {} };

  view._doAdopt(parentView);

  view.set('transitionShow', transitionShow);

  SC.run(function () {
    view.set('foo', true);
    view.set('isVisible', false);
  });

  SC.run(function () {
    view.set('isVisible', true);
  });

  // Hide the view using isVisible.
  SC.run(function () {
    equals(view.viewState, SC.CoreView.ATTACHED_SHOWING, "The view should be in the state");
    equals(child.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "The child view should be in the state");

    ok(view.get('isVisibleInWindow'), "isVisibleInWindow should be true");
    ok(!child.get('isVisibleInWindow'), "isVisibleInWindow of child should be false");

    view.set('isVisible', false);
    equals(view.viewState, SC.CoreView.ATTACHED_HIDDEN, "The view should be in the state");
    equals(child.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "The child view should be in the state");

    ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");
    ok(!child.get('isVisibleInWindow'), "isVisibleInWindow of child should be false");

    view.set('isVisible', true);
  });

  view._executeDoUpdateContent.expect(1);
  view._doUpdateVisibleStyle.expect(4);
});


test("Test hiding and showing an attached child view with child views.", function () {
  view._doAdopt(parentView);

  // Hide the view using isVisible.
  SC.run(function () {
    view.set('isVisible', false);
  });

  equals(parentView.viewState, SC.CoreView.ATTACHED_SHOWN, "The parentView view should be in the state");
  equals(view.viewState, SC.CoreView.ATTACHED_HIDDEN, "The view should be in the state");
  equals(child.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "The child view should be in the state");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");
  ok(!child.get('isVisibleInWindow'), "isVisibleInWindow of child should be false");

  // Show the view using isVisible.
  SC.run(function () {
    view.set('isVisible', true);
  });

  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "The view should be in the state");
  equals(child.viewState, SC.CoreView.ATTACHED_SHOWN, "The child view should be in the state");
  ok(view.get('isVisibleInWindow'), "isVisibleInWindow should now be true");
  ok(child.get('isVisibleInWindow'), "isVisibleInWindow of child should now be true");
});


test("Test hiding an attached parentView view and then adding child views.", function () {
  // Hide the parentView using isVisible and then adopting child views.
  SC.run(function () {
    parentView.set('isVisible', false);
    view._doAdopt(parentView);
  });

  equals(parentView.viewState, SC.CoreView.ATTACHED_HIDDEN, "The parentView view should be in the state");
  equals(view.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "The view should be in the state");
  equals(child.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "The child view should be in the state");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");
  ok(!child.get('isVisibleInWindow'), "isVisibleInWindow of child should be false");

  // Show the parentView using isVisible.
  SC.run(function () {
    parentView.set('isVisible', true);
  });

  equals(parentView.viewState, SC.CoreView.ATTACHED_SHOWN, "The parentView view should be in the state");
  equals(view.viewState, SC.CoreView.ATTACHED_SHOWN, "The view should be in the state");
  equals(child.viewState, SC.CoreView.ATTACHED_SHOWN, "The child view should be in the state");
  ok(view.get('isVisibleInWindow'), "isVisibleInWindow should be false");
  ok(child.get('isVisibleInWindow'), "isVisibleInWindow of child should be false");
});


test("Test showing an attached parentView view while hiding the child view.", function () {
  SC.run(function () {
    parentView.set('isVisible', false);
    view._doAdopt(parentView);

    // Hide the view and then show the parentView using isVisible.
    view.set('isVisible', false);
    parentView.set('isVisible', true);
  });

  equals(parentView.viewState, SC.CoreView.ATTACHED_SHOWN, "The parentView view should be in the state");
  equals(view.viewState, SC.CoreView.ATTACHED_HIDDEN, "The view should be in the state");
  equals(child.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "The child view should be in the state");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");
  ok(!child.get('isVisibleInWindow'), "isVisibleInWindow of child should be false");
});


test("Test adding a hidden child view to attached shown parentView.", function () {
  // Hide the view with isVisible and then add to parentView.
  SC.run(function () {
    view.set('isVisible', false);
    view._doAdopt(parentView);
  });

  equals(view.viewState, SC.CoreView.ATTACHED_HIDDEN, "The view should be in the state");
  equals(child.viewState, SC.CoreView.ATTACHED_HIDDEN_BY_PARENT, "The child view should be in the state");
  ok(!view.get('isVisibleInWindow'), "isVisibleInWindow should be false");
  ok(!child.get('isVisibleInWindow'), "isVisibleInWindow of child should be false");
});
