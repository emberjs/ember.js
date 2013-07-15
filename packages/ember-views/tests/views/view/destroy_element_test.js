var set = Ember.set, get = Ember.get, view;

module("Ember.View#destroyElement", {
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("if it has no element, does nothing", function() {
  var callCount = 0;
  view = Ember.View.create({
    willDestroyElement: function() { callCount++; }
  });

  ok(!get(view, 'element'), 'precond - does NOT have element');

  Ember.run(function() {
    view.destroyElement();
  });

  equal(callCount, 0, 'did not invoke callback');
});

test("if it has a element, calls willDestroyElement on receiver and child views then deletes the element", function() {
  var parentCount = 0, childCount = 0;

  view = Ember.ContainerView.create({
    willDestroyElement: function() { parentCount++; },
    childViews: [Ember.ContainerView.extend({
      // no willDestroyElement here... make sure no errors are thrown
      childViews: [Ember.View.extend({
        willDestroyElement: function() { childCount++; }
      })]
    })]
  });

  Ember.run(function() {
    view.createElement();
  });

  ok(get(view, 'element'), 'precond - view has element');

  Ember.run(function() {
    view.destroyElement();
  });

  equal(parentCount, 1, 'invoked destroy element on the parent');
  equal(childCount, 1, 'invoked destroy element on the child');
  ok(!get(view, 'element'), 'view no longer has element');
  ok(!get(get(view, 'childViews').objectAt(0), 'element'), 'child no longer has an element');
});

test("returns receiver", function() {
  var ret;
  view = Ember.View.create();

  Ember.run(function() {
    view.createElement();
    ret = view.destroyElement();
  });

  equal(ret, view, 'returns receiver');
});

test("removes element from parentNode if in DOM", function() {
  view = Ember.View.create();

  Ember.run(function() {
    view.append();
  });

  var parent = view.$().parent();

  ok(get(view, 'element'), 'precond - has element');

  Ember.run(function() {
    view.destroyElement();
  });

  equal(view.$(), undefined, 'view has no selector');
  ok(!parent.find('#'+view.get('elementId')).length, 'element no longer in parent node');
});
