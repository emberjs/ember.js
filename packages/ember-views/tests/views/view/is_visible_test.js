var get = Ember.get, set = Ember.set;

var View, view, parentBecameVisible, childBecameVisible, grandchildBecameVisible;
var parentBecameHidden, childBecameHidden, grandchildBecameHidden;

module("Ember.View#isVisible", {
  setup: function() {
    parentBecameVisible=0;
    childBecameVisible=0;
    grandchildBecameVisible=0;
    parentBecameHidden=0;
    childBecameHidden=0;
    grandchildBecameHidden=0;

    View = Ember.ContainerView.extend({
      childViews: ['child'],
      becameVisible: function() { parentBecameVisible++; },
      becameHidden: function() { parentBecameHidden++; },

      child: Ember.ContainerView.extend({
        childViews: ['grandchild'],
        becameVisible: function() { childBecameVisible++; },
        becameHidden: function() { childBecameHidden++; },

        grandchild: Ember.View.extend({
          template: function() { return "seems weird bro"; },
          becameVisible: function() { grandchildBecameVisible++; },
          becameHidden: function() { grandchildBecameHidden++; }
        })
      })
    });
  },

  teardown: function() {
    if (view) { view.destroy(); }
  }
});

test("should hide views when isVisible is false", function() {
  var view = Ember.View.create({
    isVisible: false
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "the view is hidden");

  set(view, 'isVisible', true);
  ok(view.$().is(':visible'), "the view is visible");
  view.remove();
});

test("should hide element if isVisible is false before element is created", function() {
  var view = Ember.View.create({
    isVisible: false
  });

  ok(!get(view, 'isVisible'), "precond - view is not visible");

  set(view, 'template', function() { return "foo"; });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "should be hidden");

  view.remove();
  set(view, 'isVisible', true);

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), "view should be visible");

  Ember.run(function() {
    view.remove();
  });
});

test("view should be notified after isVisible is set to false and the element has been hidden", function() {
  view = View.create({ isVisible: false });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "precond - view is hidden when appended");

  Ember.run(function() {
    view.set('isVisible', true);
  });

  ok(view.$().is(':visible'), "precond - view is now visible");
  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});

test("view should be notified after isVisible is set to false and the element has been hidden", function() {
  view = View.create({ isVisible: true });
  var childView = view.get('childViews').objectAt(0);
  var grandchildView = childView.get('childViews').objectAt(0);

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), "precond - view is visible when appended");

  Ember.run(function() {
    childView.set('isVisible', false);
  });

  ok(childView.$().is(':hidden'), "precond - view is now hidden");

  equal(childBecameHidden, 1);
  equal(grandchildBecameHidden, 1);
});

test("view should be notified after isVisible is set to true and the element has been shown", function() {
  view = View.create({ isVisible: false });
  var childView = view.get('childViews').objectAt(0);
  var grandchildView = childView.get('childViews').objectAt(0);

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "precond - view is hidden when appended");

  Ember.run(function() {
    view.set('isVisible', true);
  });

  ok(view.$().is(':visible'), "precond - view is now visible");

  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});

test("if a view descends from a hidden view, making isVisible true should not trigger becameVisible", function() {
  view = View.create({ isVisible: true });
  var childView = view.get('childViews').objectAt(0);
  var grandchildView = childView.get('childViews').objectAt(0);

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), "precond - view is visible when appended");

  Ember.run(function() {
    childView.set('isVisible', false);
  });

  Ember.run(function() {
    view.set('isVisible', false);
  });

  childBecameVisible = 0;
  grandchildBecameVisible = 0;

  Ember.run(function() {
    childView.set('isVisible', true);
  });

  equal(childBecameVisible, 0, "the child did not become visible");
  equal(grandchildBecameVisible, 0, "the grandchild did not become visible");
});

test("if a child view becomes visible while its parent is hidden, if its parent later becomes visible, it receives a becameVisible callback", function() {
  view = View.create({ isVisible: false });
  var childView = view.get('childViews').objectAt(0);
  var grandchildView = childView.get('childViews').objectAt(0);

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "precond - view is hidden when appended");

  Ember.run(function() {
    childView.set('isVisible', true);
  });

  equal(childBecameVisible, 0, "child did not become visible since parent is hidden");
  equal(grandchildBecameVisible, 0, "grandchild did not become visible since parent is hidden");

  Ember.run(function() {
    view.set('isVisible', true);
  });

  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});
