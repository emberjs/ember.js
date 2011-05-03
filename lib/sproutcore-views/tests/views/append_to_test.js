var View, view, willDestroyCalled, childView;

module("SC.View - append() and appendTo()", {
  setup: function() {
    View = SC.View.extend({});
  },

  teardown: function() {
    view.destroy();
  }
});

test("should be added to the specified element when calling append()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!view.get('element'), "precond - should not have an element");
  view.appendTo('#menu');

  var viewElem = SC.$('#menu').children();
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("should be added to the document body when calling appendTo()", function() {
  view = View.create({
    render: function(buffer) {
      buffer.push("foo bar baz");
    }
  });

  ok(!view.get('element'), "precond - should not have an element");
  view.append();

  var viewElem = SC.$(document.body).find(':contains("foo bar baz")');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("remove removes an element from the DOM", function() {
  willDestroyCalled = 0;

  view = View.create({
    willDestroyElement: function() {
      willDestroyCalled++;
    }
  });

  ok(!view.get('element'), "precond - should not have an element");
  view.append();

  ok(SC.$("#" + view.get('elementId')).length === 1, "precond - element was inserted");
  view.remove();
  ok(SC.$("#" + view.get('elementId')).length === 0, "remove removes an element from the DOM");
  ok(SC.View.views[view.get('elementId')] === view, "remove does not remove the view from the view hash");
  ok(!view.get('element'), "remove nulls out the element");
  equals(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

test("destroy more forcibly removes the view", function() {
  willDestroyCalled = 0;

  view = View.create({
    willDestroyElement: function() {
      willDestroyCalled++;
    }
  });

  ok(!view.get('element'), "precond - should not have an element");
  view.append();

  ok(SC.$("#" + view.get('elementId')).length === 1, "precond - element was inserted");

  view.destroy();

  ok(SC.$("#" + view.get('elementId')).length === 0, "destroy removes an element from the DOM");
  ok(SC.View.views[view.get('elementId')] === undefined, "destroy removes a view from the global views hash");
  equals(view.get('isDestroyed'), true, "the view is marked as destroyed");
  ok(!view.get('element'), "the view no longer has an element");
  equals(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

module("SC.View - append() and appendTo() in a view hierarchy", {
  setup: function() {
    View = SC.View.extend({
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

test("should be added to the specified element when calling appendTo()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!view.get('element'), "precond - should not have an element");
  view.appendTo('#menu');

  var viewElem = SC.$('#menu #child');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("should be added to the document body when calling append()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!view.get('element'), "precond - should not have an element");
  view.append();

  var viewElem = SC.$('#child');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

module("SC.View - removing views in a view hierarchy", {
  setup: function() {
    willDestroyCalled = 0;

    view = SC.View.create({
      childViews: ['child'],
      child: SC.View.create({
        willDestroyElement: function() {
          willDestroyCalled++;
        }
      })
    });

    childView = view.get('child');
  },

  teardown: function() {
    view.destroy();
  }
});

test("remove removes child elements from the DOM", function() {
  ok(!childView.get('element'), "precond - should not have an element");
  view.append();

  ok(SC.$("#" + childView.get('elementId')).length === 1, "precond - element was inserted");

  // remove parent view
  view.remove();

  ok(SC.$("#" + childView.get('elementId')).length === 0, "remove removes child elements the DOM");
  ok(SC.View.views[childView.get('elementId')] === childView, "remove does not remove child views from the view hash");
  ok(!childView.get('element'), "remove nulls out child elements");
  equals(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

test("destroy more forcibly removes child views", function() {
  ok(!childView.get('element'), "precond - should not have an element");
  view.append();

  ok(SC.$("#" + childView.get('elementId')).length === 1, "precond - child element was inserted");

  view.destroy();

  ok(SC.$("#" + childView.get('elementId')).length === 0, "destroy removes child elements from the DOM");
  ok(SC.View.views[childView.get('elementId')] === undefined, "destroy removes a child views from the global views hash");
  equals(childView.get('isDestroyed'), true, "child views are marked as destroyed");
  ok(!childView.get('element'), "child views no longer have an element");
  equals(willDestroyCalled, 1, "the willDestroyElement hook was called once on children");
});

test("destroy removes a child view from its parent", function() {
  ok(!childView.get('element'), "precond - should not have an element");
  view.append();

  ok(SC.$("#" + childView.get('elementId')).length === 1, "precond - child element was inserted");

  childView.destroy();

  ok(view.getPath('childViews.length') === 0, "Destroyed child views should be removed from their parent");
});

