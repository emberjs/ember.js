import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import jQuery from "ember-views/system/jquery";
import EmberView from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";

var View, view;

QUnit.module("EmberView - replaceIn()", {
  setup: function() {
    View = EmberView.extend({});
  },

  teardown: function() {
    run(function() {
      view.destroy();
    });
  }
});

QUnit.test("should be added to the specified element when calling replaceIn()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  run(function() {
    view.replaceIn('#menu');
  });

  var viewElem = jQuery('#menu').children();
  ok(viewElem.length > 0, "creates and replaces the view's element");
});

QUnit.test("raises an assert when a target does not exist in the DOM", function() {
  view = View.create();

  expectAssertion(function() {
    run(function() {
      view.replaceIn('made-up-target');
    });
  });
});


QUnit.test("should remove previous elements when calling replaceIn()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"><p>Foo</p></div>');
  var viewElem = jQuery('#menu').children();

  view = View.create();

  ok(viewElem.length === 1, "should have one element");

  run(function() {
    view.replaceIn('#menu');
  });

  ok(viewElem.length === 1, "should have one element");

});

QUnit.test("should move the view to the inDOM state after replacing", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');
  view = View.create();

  run(function() {
    view.replaceIn('#menu');
  });

  equal(view.currentState, view._states.inDOM, "the view is in the inDOM state");
});

QUnit.module("EmberView - replaceIn() in a view hierarchy", {
  setup: function() {
    expectDeprecation("Setting `childViews` on a Container is deprecated.");

    View = ContainerView.extend({
      childViews: ['child'],
      child: EmberView.extend({
        elementId: 'child'
      })
    });
  },

  teardown: function() {
    run(function() {
      view.destroy();
    });
  }
});

QUnit.test("should be added to the specified element when calling replaceIn()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  run(function() {
    view.replaceIn('#menu');
  });

  var viewElem = jQuery('#menu #child');
  ok(viewElem.length > 0, "creates and replaces the view's element");
});
