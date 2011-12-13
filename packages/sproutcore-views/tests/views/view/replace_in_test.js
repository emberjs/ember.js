// ==========================================================================
// Project:   SproutCore Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set, get = SC.get;

var View, view, willDestroyCalled, childView;

module("SC.View - replaceIn()", {
  setup: function() {
    View = SC.View.extend({});
  },

  teardown: function() {
    view.destroy();
  }
});

test("should be added to the specified element when calling replaceIn()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  SC.run(function() {
    view.replaceIn('#menu');
  });

  var viewElem = SC.$('#menu').children();
  ok(viewElem.length > 0, "creates and replaces the view's element");
});

test("should remove previous elements when calling replaceIn()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"><p>Foo</p></div>');
  var viewElem = SC.$('#menu').children();

  view = View.create();

  ok(viewElem.length == 1, "should have one element");

  SC.run(function() {
    view.replaceIn('#menu');
  });

  ok(viewElem.length == 1, "should have one element");

});

module("SC.View - replaceIn() in a view hierarchy", {
  setup: function() {
    View = SC.ContainerView.extend({
      childViews: ['child'],
      child: SC.View.extend({
        elementId: 'child'
      })
    });
  },

  teardown: function() {
    view.destroy();
  }
});

test("should be added to the specified element when calling replaceIn()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  SC.run(function() {
    view.replaceIn('#menu');
  });

  var viewElem = SC.$('#menu #child');
  ok(viewElem.length > 0, "creates and replaces the view's element");
});
