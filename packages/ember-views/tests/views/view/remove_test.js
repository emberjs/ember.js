var set = Ember.set, get = Ember.get;
var indexOf = Ember.EnumerableUtils.indexOf;

// .......................................................
// removeChild()
//

var parentView, child;
module("Ember.View#removeChild", {
  setup: function() {
    parentView = Ember.ContainerView.create({ childViews: [Ember.View] });
    child = get(parentView, 'childViews').objectAt(0);
  },
  teardown: function() {
    Ember.run(function() {
      parentView.destroy();
      child.destroy();
    });
  }
});

test("returns receiver", function() {
  equal(parentView.removeChild(child), parentView, 'receiver');
});

test("removes child from parent.childViews array", function() {
  ok(indexOf(get(parentView, 'childViews'), child)>=0, 'precond - has child in childViews array before remove');
  parentView.removeChild(child);
  ok(indexOf(get(parentView, 'childViews'), child)<0, 'removed child');
});

test("sets parentView property to null", function() {
  ok(get(child, 'parentView'), 'precond - has parentView');
  parentView.removeChild(child);
  ok(!get(child, 'parentView'), 'parentView is now null');
});

// .......................................................
// removeAllChildren()
//
var view, childViews;
module("Ember.View#removeAllChildren", {
  setup: function() {
    view = Ember.ContainerView.create({
      childViews: [Ember.View, Ember.View, Ember.View]
    });
    childViews = view.get('childViews');
  },
  teardown: function() {
    Ember.run(function() {
      childViews.forEach(function(v){ v.destroy(); });
      view.destroy();
    });
  }
});

test("removes all child views", function() {
  equal(get(view, 'childViews.length'), 3, 'precond - has child views');

  view.removeAllChildren();
  equal(get(view, 'childViews.length'), 0, 'removed all children');
});

test("returns receiver", function() {
  equal(view.removeAllChildren(), view, 'receiver');
});

// .......................................................
// removeFromParent()
//
module("Ember.View#removeFromParent", {
  teardown: function() {
    Ember.run(function() {
      if (parentView) { parentView.destroy(); }
      if (child) { child.destroy(); }
      if (view) { view.destroy(); }
    });
  }
});

test("removes view from parent view", function() {
  parentView = Ember.ContainerView.create({ childViews: [Ember.View] });
  child = get(parentView, 'childViews').objectAt(0);
  ok(get(child, 'parentView'), 'precond - has parentView');

  Ember.run(function(){
    parentView.createElement();
  });

  ok(parentView.$('div').length, "precond - has a child DOM element");

  Ember.run(function() {
    child.removeFromParent();
  });

  ok(!get(child, 'parentView'), 'no longer has parentView');
  ok(indexOf(get(parentView, 'childViews'), child)<0, 'no longer in parent childViews');
  equal(parentView.$('div').length, 0, "removes DOM element from parent");
});

test("returns receiver", function() {
  parentView = Ember.ContainerView.create({ childViews: [Ember.View] });
  child = get(parentView, 'childViews').objectAt(0);
  var removed = Ember.run(function() {
    return child.removeFromParent();
  });

  equal(removed, child, 'receiver');
});

test("does nothing if not in parentView", function() {
  var callCount = 0;
  child = Ember.View.create();

  // monkey patch for testing...
  ok(!get(child, 'parentView'), 'precond - has no parent');

  child.removeFromParent();

  Ember.run(function() {
    child.destroy();
  });
});


test("the DOM element is gone after doing append and remove in two separate runloops", function() {
  view = Ember.View.create();
  Ember.run(function() {
    view.append();
  });
  Ember.run(function() {
    view.remove();
  });

  var viewElem = Ember.$('#'+get(view, 'elementId'));
  ok(viewElem.length === 0, "view's element doesn't exist in DOM");
});

test("the DOM element is gone after doing append and remove in a single runloop", function() {
  view = Ember.View.create();
  Ember.run(function() {
    view.append();
    view.remove();
  });

  var viewElem = Ember.$('#'+get(view, 'elementId'));
  ok(viewElem.length === 0, "view's element doesn't exist in DOM");
});

