import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";

import jQuery from "ember-views/system/jquery";
import EmberView from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";
import compile from "ember-template-compiler/system/compile";

var View, view, willDestroyCalled, childView;

QUnit.module("EmberView - append() and appendTo()", {
  setup() {
    View = EmberView.extend({});
  },

  teardown() {
    run(function() {
      if (!view.isDestroyed) { view.destroy(); }
    });
  }
});

QUnit.test("should be added to the specified element when calling appendTo()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  run(function() {
    view.appendTo('#menu');
  });

  var viewElem = jQuery('#menu').children();
  ok(viewElem.length > 0, "creates and appends the view's element");
});

QUnit.test("should be added to the document body when calling append()", function() {
  view = View.create({
    template: compile("foo bar baz")
  });

  ok(!get(view, 'element'), "precond - should not have an element");

  run(function() {
    view.append();
  });

  var viewElem = jQuery(document.body).find(':contains("foo bar baz")');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

QUnit.test("raises an assert when a target does not exist in the DOM", function() {
  view = View.create();

  expectAssertion(function() {
    run(function() {
      view.appendTo('does-not-exist-in-dom');
    });
  });
});

QUnit.test("append calls willInsertElement and didInsertElement callbacks", function() {
  var willInsertElementCalled = false;
  var willInsertElementCalledInChild = false;
  var didInsertElementCalled = false;

  var ViewWithCallback = View.extend({
    willInsertElement() {
      willInsertElementCalled = true;
    },
    didInsertElement() {
      didInsertElementCalled = true;
    },
    childView: EmberView.create({
      willInsertElement() {
        willInsertElementCalledInChild = true;
      }
    }),
    template: compile("{{view view.childView}}")
  });

  view = ViewWithCallback.create();

  run(function() {
    view.append();
  });

  ok(willInsertElementCalled, "willInsertElement called");
  ok(willInsertElementCalledInChild, "willInsertElement called in child");
  ok(didInsertElementCalled, "didInsertElement called");
});

QUnit.test("a view calls its children's willInsertElement and didInsertElement", function() {
  var parentView;
  var willInsertElementCalled = false;
  var didInsertElementCalled = false;
  var didInsertElementSawElement = false;

  parentView = EmberView.create({
    ViewWithCallback: EmberView.extend({
      template: compile('<div id="do-i-exist"></div>'),

      willInsertElement() {
        willInsertElementCalled = true;
      },
      didInsertElement() {
        didInsertElementCalled = true;
        didInsertElementSawElement = (this.$('div').length === 1);
      }
    }),

    template: compile('{{#if view.condition}}{{view view.ViewWithCallback}}{{/if}}'),
    condition: false
  });

  run(function() {
    parentView.append();
  });
  run(function() {
    parentView.set('condition', true);
  });

  ok(willInsertElementCalled, "willInsertElement called");
  ok(didInsertElementCalled, "didInsertElement called");
  ok(didInsertElementSawElement, "didInsertElement saw element");

  run(function() {
    parentView.destroy();
  });

});

QUnit.test("replacing a view should invalidate childView elements", function() {
  var elementOnDidInsert;

  view = EmberView.create({
    show: false,

    CustomView: EmberView.extend({
      init() {
        this._super.apply(this, arguments);
        // This will be called in preRender
        // We want it to cache a null value
        // Hopefully it will be invalidated when `show` is toggled
        this.get('element');
      },

      didInsertElement() {
        elementOnDidInsert = this.get('element');
      }
    }),

    template: compile("{{#if view.show}}{{view view.CustomView}}{{/if}}")
  });

  run(function() { view.append(); });

  run(function() { view.set('show', true); });

  ok(elementOnDidInsert, "should have an element on insert");

  run(function() { view.destroy(); });
});

QUnit.test("trigger rerender of parent and SimpleBoundView", function () {
  var view = EmberView.create({
    show: true,
    foo: 'bar',
    template: compile("{{#if view.show}}{{#if view.foo}}{{view.foo}}{{/if}}{{/if}}")
  });

  run(function() { view.append(); });

  equal(view.$().text(), 'bar');

  run(function() {
    view.set('foo', 'baz'); // schedule render of simple bound
    view.set('show', false); // destroy tree
  });

  equal(view.$().text(), '');

  run(function() {
    view.destroy();
  });
});

QUnit.skip("remove removes an element from the DOM", function() {
  willDestroyCalled = 0;

  view = View.create({
    willDestroyElement() {
      willDestroyCalled++;
    }
  });

  ok(!get(view, 'element'), "precond - should not have an element");

  run(function() {
    view.append();
  });

  ok(jQuery("#" + get(view, 'elementId')).length === 1, "precond - element was inserted");

  run(function() {
    view.remove();
  });

  ok(jQuery("#" + get(view, 'elementId')).length === 0, "remove removes an element from the DOM");
  ok(EmberView.views[get(view, 'elementId')] === undefined, "remove does not remove the view from the view hash");
  ok(!get(view, 'element'), "remove nulls out the element");
  equal(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

QUnit.skip("destroy more forcibly removes the view", function() {
  willDestroyCalled = 0;

  view = View.create({
    willDestroyElement() {
      willDestroyCalled++;
    }
  });

  ok(!get(view, 'element'), "precond - should not have an element");

  run(function() {
    view.append();
  });

  ok(jQuery("#" + get(view, 'elementId')).length === 1, "precond - element was inserted");

  run(function() {
    view.destroy();
  });

  ok(jQuery("#" + get(view, 'elementId')).length === 0, "destroy removes an element from the DOM");
  ok(EmberView.views[get(view, 'elementId')] === undefined, "destroy removes a view from the global views hash");
  equal(get(view, 'isDestroyed'), true, "the view is marked as destroyed");
  ok(!get(view, 'element'), "the view no longer has an element");
  equal(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

QUnit.module("EmberView - append() and appendTo() in a view hierarchy", {
  setup() {
    expectDeprecation("Setting `childViews` on a Container is deprecated.");

    View = ContainerView.extend({
      childViews: ['child'],
      child: EmberView.extend({
        elementId: 'child'
      })
    });
  },

  teardown() {
    run(function() {
      if (!view.isDestroyed) { view.destroy(); }
    });
  }
});

QUnit.test("should be added to the specified element when calling appendTo()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  run(function() {
    view.appendTo('#menu');
  });

  var viewElem = jQuery('#menu #child');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

QUnit.test("should be added to the document body when calling append()", function() {
  jQuery("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  run(function() {
    view.append();
  });

  var viewElem = jQuery('#child');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

QUnit.module("EmberView - removing views in a view hierarchy", {
  setup() {
    expectDeprecation("Setting `childViews` on a Container is deprecated.");

    willDestroyCalled = 0;

    view = ContainerView.create({
      childViews: ['child'],
      child: EmberView.create({
        willDestroyElement() {
          willDestroyCalled++;
        }
      })
    });

    childView = get(view, 'child');
  },

  teardown() {
    run(function() {
      if (!view.isDestroyed) { view.destroy(); }
    });
  }
});

QUnit.skip("remove removes child elements from the DOM", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  run(function() {
    view.append();
  });

  ok(jQuery("#" + get(childView, 'elementId')).length === 1, "precond - element was inserted");

  // remove parent view
  run(function() {
    view.remove();
  });

  ok(jQuery("#" + get(childView, 'elementId')).length === 0, "remove removes child elements the DOM");
  ok(EmberView.views[get(childView, 'elementId')] === undefined, "remove does not remove child views from the view hash");
  ok(!get(childView, 'element'), "remove nulls out child elements");
  equal(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

QUnit.skip("destroy more forcibly removes child views", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  run(function() {
    view.append();
  });

  ok(jQuery("#" + get(childView, 'elementId')).length === 1, "precond - child element was inserted");

  willDestroyCalled = 0;

  run(function() {
    view.destroy();
  });

  ok(jQuery("#" + get(childView, 'elementId')).length === 0, "destroy removes child elements from the DOM");
  ok(EmberView.views[get(childView, 'elementId')] === undefined, "destroy removes a child views from the global views hash");
  equal(get(childView, 'isDestroyed'), true, "child views are marked as destroyed");
  ok(!get(childView, 'element'), "child views no longer have an element");
  equal(willDestroyCalled, 1, "the willDestroyElement hook was called once on children");
});

QUnit.test("destroy removes a child view from its parent", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  run(function() {
    view.append();
  });

  ok(jQuery("#" + get(childView, 'elementId')).length === 1, "precond - child element was inserted");

  run(function() {
    childView.destroy();
  });

  ok(get(view, 'childViews.length') === 0, "Destroyed child views should be removed from their parent");
});

