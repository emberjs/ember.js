var View, view;

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

