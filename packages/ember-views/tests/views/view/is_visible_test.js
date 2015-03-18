import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";
import compile from "ember-template-compiler/system/compile";

var View, view, parentBecameVisible, childBecameVisible, grandchildBecameVisible;
var parentBecameHidden, childBecameHidden, grandchildBecameHidden;

QUnit.module("EmberView#isVisible", {
  teardown: function() {
    if (view) {
      run(function() { view.destroy(); });
    }
  }
});

test("should hide views when isVisible is false", function() {
  view = EmberView.create({
    isVisible: false
  });

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "the view is hidden");

  run(function(){
    set(view, 'isVisible', true);
  });

  ok(view.$().is(':visible'), "the view is visible");
  run(function() {
    view.remove();
  });
});

test("should hide element if isVisible is false before element is created", function() {
  view = EmberView.create({
    isVisible: false
  });

  ok(!get(view, 'isVisible'), "precond - view is not visible");

  set(view, 'template', function() { return "foo"; });

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "should be hidden");

  run(function() {
    view.remove();
  });

  run(function(){
    set(view, 'isVisible', true);
  });

  run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), "view should be visible");

  run(function() {
    view.remove();
  });
});

QUnit.module("EmberView#isVisible with Container", {
  setup: function() {
    expectDeprecation("Setting `childViews` on a Container is deprecated.");

    parentBecameVisible=0;
    childBecameVisible=0;
    grandchildBecameVisible=0;
    parentBecameHidden=0;
    childBecameHidden=0;
    grandchildBecameHidden=0;

    View = ContainerView.extend({
      childViews: ['child'],
      becameVisible: function() { parentBecameVisible++; },
      becameHidden: function() { parentBecameHidden++; },

      child: ContainerView.extend({
        childViews: ['grandchild'],
        becameVisible: function() { childBecameVisible++; },
        becameHidden: function() { childBecameHidden++; },

        grandchild: EmberView.extend({
          template: function() { return "seems weird bro"; },
          becameVisible: function() { grandchildBecameVisible++; },
          becameHidden: function() { grandchildBecameHidden++; }
        })
      })
    });
  },

  teardown: function() {
    if (view) {
      run(function() { view.destroy(); });
    }
  }
});

test("view should be notified after isVisible is set to false and the element has been hidden", function() {
  run(function() {
    view = View.create({ isVisible: false });
    view.append();
  });

  ok(view.$().is(':hidden'), "precond - view is hidden when appended");

  run(function() {
    view.set('isVisible', true);
  });

  ok(view.$().is(':visible'), "precond - view is now visible");
  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});

test("view should be notified after isVisible is set to false and the element has been hidden", function() {
  run(function() {
    view = View.create({ isVisible: false });
    view.append();
  });

  ok(view.$().is(':hidden'), "precond - view is hidden when appended");

  run(function() {
    view.set('isVisible', true);
  });

  ok(view.$().is(':visible'), "precond - view is now visible");
  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});

test("view should change visibility with a virtual childView", function() {
  view = View.create({
    isVisible: true,
    template: compile('<div {{bind-attr bing="tweep"}}></div>')
  });

  run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), "precond - view is visible when appended");

  run(function() {
    view.set('isVisible', false);
  });

  ok(view.$().is(':hidden'), "precond - view is now hidden");
});

test("view should be notified after isVisible is set to true and the element has been shown", function() {
  view = View.create({ isVisible: false });

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "precond - view is hidden when appended");

  run(function() {
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

  run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), "precond - view is visible when appended");

  run(function() {
    childView.set('isVisible', false);
  });

  run(function() {
    view.set('isVisible', false);
  });

  childBecameVisible = 0;
  grandchildBecameVisible = 0;

  run(function() {
    childView.set('isVisible', true);
  });

  equal(childBecameVisible, 0, "the child did not become visible");
  equal(grandchildBecameVisible, 0, "the grandchild did not become visible");
});

test("if a child view becomes visible while its parent is hidden, if its parent later becomes visible, it receives a becameVisible callback", function() {
  view = View.create({ isVisible: false });
  var childView = view.get('childViews').objectAt(0);

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "precond - view is hidden when appended");

  run(function() {
    childView.set('isVisible', true);
  });

  equal(childBecameVisible, 0, "child did not become visible since parent is hidden");
  equal(grandchildBecameVisible, 0, "grandchild did not become visible since parent is hidden");

  run(function() {
    view.set('isVisible', true);
  });

  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});
