var set = Ember.set, get = Ember.get;

var View, view, willDestroyCalled, childView;

module("Ember.View - replaceIn()", {
  setup: function() {
    View = Ember.View.extend({});
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("should be added to the specified element when calling replaceIn()", function() {
  Ember.$("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.replaceIn('#menu');
  });

  var viewElem = Ember.$('#menu').children();
  ok(viewElem.length > 0, "creates and replaces the view's element");
});

test("raises an assert when a target does not exist in the DOM", function() {
  view = View.create();

  expectAssertion(function() {
    Ember.run(function() {
      view.replaceIn('made-up-target');
    });
  });
});


test("should remove previous elements when calling replaceIn()", function() {
  Ember.$("#qunit-fixture").html('<div id="menu"><p>Foo</p></div>');
  var viewElem = Ember.$('#menu').children();

  view = View.create();

  ok(viewElem.length === 1, "should have one element");

  Ember.run(function() {
    view.replaceIn('#menu');
  });

  ok(viewElem.length === 1, "should have one element");

});

module("Ember.View - replaceIn() in a view hierarchy", {
  setup: function() {
    View = Ember.ContainerView.extend({
      childViews: ['child'],
      child: Ember.View.extend({
        elementId: 'child'
      })
    });
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("should be added to the specified element when calling replaceIn()", function() {
  Ember.$("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.replaceIn('#menu');
  });

  var viewElem = Ember.$('#menu #child');
  ok(viewElem.length > 0, "creates and replaces the view's element");
});
