// ==========================================================================
// Project:   Ember Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get;

var View, view, willDestroyCalled, childView;

module("Ember.View - append() and appendTo()", {
  setup: function() {
    View = Ember.View.extend({});
  },

  teardown: function() {
    if (!view.isDestroyed) { view.destroy(); }
  }
});

test("should be added to the specified element when calling append()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.appendTo('#menu');
  });

  var viewElem = Ember.$('#menu').children();
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("should be added to the document body when calling appendTo()", function() {
  view = View.create({
    render: function(buffer) {
      buffer.push("foo bar baz");
    }
  });

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  var viewElem = Ember.$(document.body).find(':contains("foo bar baz")');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("append calls willInsertElement and didInsertElement callbacks", function(){
  var willInsertElementCalled = false;
  var willInsertElementCalledInChild = false;
  var didInsertElementCalled = false;
  
  var ViewWithCallback = View.extend({
    willInsertElement: function(){
      willInsertElementCalled = true;
    },
    didInsertElement: function(){
      didInsertElementCalled = true;
    },
    render: function(buffer) {
      this.appendChild(Ember.View.create({
        willInsertElement: function() {
          willInsertElementCalledInChild = true;
        }
      }));
    }
  });
  
  view = ViewWithCallback.create();

  Ember.run(function() {
    view.append();
  });

  ok(willInsertElementCalled, "willInsertElement called");
  ok(willInsertElementCalledInChild, "willInsertElement called in child");
  ok(didInsertElementCalled, "didInsertElement called");
});

test("remove removes an element from the DOM", function() {
  willDestroyCalled = 0;

  view = View.create({
    willDestroyElement: function() {
      willDestroyCalled++;
    }
  });

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  ok(Ember.$("#" + get(view, 'elementId')).length === 1, "precond - element was inserted");

  Ember.run(function() {
    view.remove();
  });

  ok(Ember.$("#" + get(view, 'elementId')).length === 0, "remove removes an element from the DOM");
  ok(Ember.View.views[get(view, 'elementId')] === view, "remove does not remove the view from the view hash");
  ok(!get(view, 'element'), "remove nulls out the element");
  equals(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

test("destroy more forcibly removes the view", function() {
  willDestroyCalled = 0;

  view = View.create({
    willDestroyElement: function() {
      willDestroyCalled++;
    }
  });

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  ok(Ember.$("#" + get(view, 'elementId')).length === 1, "precond - element was inserted");

  Ember.run(function() {
    view.destroy();
  });

  ok(Ember.$("#" + get(view, 'elementId')).length === 0, "destroy removes an element from the DOM");
  ok(Ember.View.views[get(view, 'elementId')] === undefined, "destroy removes a view from the global views hash");
  equals(get(view, 'isDestroyed'), true, "the view is marked as destroyed");
  ok(!get(view, 'element'), "the view no longer has an element");
  equals(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

module("Ember.View - append() and appendTo() in a view hierarchy", {
  setup: function() {
    View = Ember.ContainerView.extend({
      childViews: ['child'],
      child: Ember.View.extend({
        elementId: 'child'
      })
    });
  },

  teardown: function() {
    if (!view.isDestroyed) { view.destroy(); }
  }
});

test("should be added to the specified element when calling appendTo()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.appendTo('#menu');
  });

  var viewElem = Ember.$('#menu #child');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("should be added to the document body when calling append()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  var viewElem = Ember.$('#child');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

module("Ember.View - removing views in a view hierarchy", {
  setup: function() {
    willDestroyCalled = 0;

    view = Ember.ContainerView.create({
      childViews: ['child'],
      child: Ember.View.create({
        willDestroyElement: function() {
          willDestroyCalled++;
        }
      })
    });

    childView = get(view, 'child');
  },

  teardown: function() {
    if (!view.isDestroyed) { view.destroy(); }
  }
});

test("remove removes child elements from the DOM", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  ok(Ember.$("#" + get(childView, 'elementId')).length === 1, "precond - element was inserted");

  // remove parent view
  Ember.run(function() {
    view.remove();
  });

  ok(Ember.$("#" + get(childView, 'elementId')).length === 0, "remove removes child elements the DOM");
  ok(Ember.View.views[get(childView, 'elementId')] === childView, "remove does not remove child views from the view hash");
  ok(!get(childView, 'element'), "remove nulls out child elements");
  equals(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

test("destroy more forcibly removes child views", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  ok(Ember.$("#" + get(childView, 'elementId')).length === 1, "precond - child element was inserted");

  willDestroyCalled = 0;

  Ember.run(function() {
    view.destroy();
  });

  ok(Ember.$("#" + get(childView, 'elementId')).length === 0, "destroy removes child elements from the DOM");
  ok(Ember.View.views[get(childView, 'elementId')] === undefined, "destroy removes a child views from the global views hash");
  equals(get(childView, 'isDestroyed'), true, "child views are marked as destroyed");
  ok(!get(childView, 'element'), "child views no longer have an element");
  equals(willDestroyCalled, 1, "the willDestroyElement hook was called once on children");
});

test("destroy removes a child view from its parent", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  ok(Ember.$("#" + get(childView, 'elementId')).length === 1, "precond - child element was inserted");

  Ember.run(function() {
    childView.destroy();
  });

  ok(Ember.getPath(view, 'childViews.length') === 0, "Destroyed child views should be removed from their parent");
});

