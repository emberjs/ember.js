// ==========================================================================
// Project:   SproutCore Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set, get = SC.get;

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

  ok(!get(view, 'element'), "precond - should not have an element");

  SC.run(function() {
    view.appendTo('#menu');
  });

  var viewElem = SC.$('#menu').children();
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("should be added to the document body when calling appendTo()", function() {
  view = View.create({
    render: function(buffer) {
      buffer.push("foo bar baz");
    }
  });

  ok(!get(view, 'element'), "precond - should not have an element");

  SC.run(function() {
    view.append();
  });

  var viewElem = SC.$(document.body).find(':contains("foo bar baz")');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("append calls willInsertElement and didInsertElement callbacks", function(){
  var willInsertElementCalled = false;
  var didInsertElementCalled = false;
  
  var ViewWithCallback = View.extend({
    willInsertElement: function(){
      willInsertElementCalled = true;
    },
    didInsertElement: function(){
      didInsertElementCalled = true;
    }
  });
  
  view = ViewWithCallback.create()

  SC.run(function() {
    view.append();
  });

  ok(willInsertElementCalled, "willInsertElement called");
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

  SC.run(function() {
    view.append();
  });

  ok(SC.$("#" + get(view, 'elementId')).length === 1, "precond - element was inserted");

  SC.run(function() {
    view.remove();
  });

  ok(SC.$("#" + get(view, 'elementId')).length === 0, "remove removes an element from the DOM");
  ok(SC.View.views[get(view, 'elementId')] === view, "remove does not remove the view from the view hash");
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

  SC.run(function() {
    view.append();
  });

  ok(SC.$("#" + get(view, 'elementId')).length === 1, "precond - element was inserted");

  SC.run(function() {
    view.destroy();
  });

  ok(SC.$("#" + get(view, 'elementId')).length === 0, "destroy removes an element from the DOM");
  ok(SC.View.views[get(view, 'elementId')] === undefined, "destroy removes a view from the global views hash");
  equals(get(view, 'isDestroyed'), true, "the view is marked as destroyed");
  ok(!get(view, 'element'), "the view no longer has an element");
  equals(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

module("SC.View - append() and appendTo() in a view hierarchy", {
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

test("should be added to the specified element when calling appendTo()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  SC.run(function() {
    view.appendTo('#menu');
  });

  var viewElem = SC.$('#menu #child');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("should be added to the document body when calling append()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  SC.run(function() {
    view.append();
  });

  var viewElem = SC.$('#child');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

module("SC.View - removing views in a view hierarchy", {
  setup: function() {
    willDestroyCalled = 0;

    view = SC.ContainerView.create({
      childViews: ['child'],
      child: SC.View.create({
        willDestroyElement: function() {
          willDestroyCalled++;
        }
      })
    });

    childView = get(view, 'child');
  },

  teardown: function() {
    view.destroy();
  }
});

test("remove removes child elements from the DOM", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  SC.run(function() {
    view.append();
  });

  ok(SC.$("#" + get(childView, 'elementId')).length === 1, "precond - element was inserted");

  // remove parent view
  SC.run(function() {
    view.remove();
  });

  ok(SC.$("#" + get(childView, 'elementId')).length === 0, "remove removes child elements the DOM");
  ok(SC.View.views[get(childView, 'elementId')] === childView, "remove does not remove child views from the view hash");
  ok(!get(childView, 'element'), "remove nulls out child elements");
  equals(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

test("destroy more forcibly removes child views", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  SC.run(function() {
    view.append();
  });

  ok(SC.$("#" + get(childView, 'elementId')).length === 1, "precond - child element was inserted");

  willDestroyCalled = 0;

  SC.run(function() {
    view.destroy();
  });

  ok(SC.$("#" + get(childView, 'elementId')).length === 0, "destroy removes child elements from the DOM");
  ok(SC.View.views[get(childView, 'elementId')] === undefined, "destroy removes a child views from the global views hash");
  equals(get(childView, 'isDestroyed'), true, "child views are marked as destroyed");
  ok(!get(childView, 'element'), "child views no longer have an element");
  equals(willDestroyCalled, 1, "the willDestroyElement hook was called once on children");
});

test("destroy removes a child view from its parent", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  SC.run(function() {
    view.append();
  });

  ok(SC.$("#" + get(childView, 'elementId')).length === 1, "precond - child element was inserted");

  SC.run(function() {
    childView.destroy();
  });

  ok(SC.getPath(view, 'childViews.length') === 0, "Destroyed child views should be removed from their parent");
});

