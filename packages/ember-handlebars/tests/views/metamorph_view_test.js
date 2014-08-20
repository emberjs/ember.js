import jQuery from "ember-views/system/jquery";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { observer } from "ember-metal/mixin";
import EmberHandlebars from "ember-handlebars-compiler";

import _MetamorphView from "ember-handlebars/views/metamorph_view";

var view, childView, metamorphView;

QUnit.module("Metamorph views", {
  setup: function() {
    view = EmberView.create({
      render: function(buffer) {
        buffer.push("<h1>View</h1>");
        this.appendChild(metamorphView);
      }
    });
  },

  teardown: function() {
    run(function() {
      view.destroy();
      if (childView && !childView.isDestroyed) {
        childView.destroy();
      }

      if (metamorphView && !metamorphView.isDestroyed) {
        metamorphView.destroy();
      }
    });
  }
});

test("a Metamorph view is not a view's parentView", function() {
  childView = EmberView.create({
    render: function(buffer) {
      buffer.push("<p>Bye bros</p>");
    }
  });

  metamorphView = _MetamorphView.create({
    render: function(buffer) {
      buffer.push("<h2>Meta</h2>");
      this.appendChild(childView);
    }
  });

  run(function() {
    view.appendTo("#qunit-fixture");
  });

  equal(get(childView, 'parentView'), view, "A child of a metamorph view cannot see the metamorph view as its parent");

  var children = get(view, 'childViews');

  equal(get(children, 'length'), 1, "precond - there is only one child of the main node");
  equal(children.objectAt(0), childView, "... and it is not the metamorph");
});

QUnit.module("Metamorph views correctly handle DOM", {
  setup: function() {
    view = EmberView.create({
      render: function(buffer) {
        buffer.push("<h1>View</h1>");
        this.appendChild(metamorphView);
      }
    });

    metamorphView = _MetamorphView.create({
      powerRanger: "Jason",

      render: function(buffer) {
        buffer.push("<h2 id='from-meta'>"+get(this, 'powerRanger')+"</h2>");
      }
    });

    run(function() {
      view.appendTo("#qunit-fixture");
    });
  },

  teardown: function() {
    run(function() {
      view.destroy();
      if (!metamorphView.isDestroyed) {
        metamorphView.destroy();
      }
    });
  }
});

test("a metamorph view generates without a DOM node", function() {
  var meta = jQuery("> h2", "#" + get(view, 'elementId'));

  equal(meta.length, 1, "The metamorph element should be directly inside its parent");
});

test("a metamorph view can be removed from the DOM", function() {
  run(function() {
    metamorphView.destroy();
  });

  var meta = jQuery('#from-morph');
  equal(meta.length, 0, "the associated DOM was removed");
});

test("a metamorph view can be rerendered", function() {
  equal(jQuery('#from-meta').text(), "Jason", "precond - renders to the DOM");

  set(metamorphView, 'powerRanger', 'Trini');
  run(function() {
    metamorphView.rerender();
  });

  equal(jQuery('#from-meta').text(), "Trini", "updates value when re-rendering");
});


// Redefining without setup/teardown
QUnit.module("Metamorph views correctly handle DOM");

test("a metamorph view calls its childrens' willInsertElement and didInsertElement", function() {
  var parentView;
  var willInsertElementCalled = false;
  var didInsertElementCalled = false;
  var didInsertElementSawElement = false;

  parentView = EmberView.create({
    ViewWithCallback: EmberView.extend({
      template: EmberHandlebars.compile('<div id="do-i-exist"></div>'),

      willInsertElement: function() {
        willInsertElementCalled = true;
      },
      didInsertElement: function() {
        didInsertElementCalled = true;
        didInsertElementSawElement = (this.$('div').length === 1);
      }
    }),

    template: EmberHandlebars.compile('{{#if view.condition}}{{view "view.ViewWithCallback"}}{{/if}}'),
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

test("replacing a Metamorph should invalidate childView elements", function() {
  var elementOnDidChange, elementOnDidInsert;

  view = EmberView.create({
    show: false,

    CustomView: EmberView.extend({
      init: function() {
        this._super();
        // This will be called in preRender
        // We want it to cache a null value
        // Hopefully it will be invalidated when `show` is toggled
        this.get('element');
      },

      elementDidChange: observer('element', function() {
        elementOnDidChange = this.get('element');
      }),

      didInsertElement: function() {
        elementOnDidInsert = this.get('element');
      }
    }),

    template: EmberHandlebars.compile("{{#if view.show}}{{view view.CustomView}}{{/if}}")
  });

  run(function() { view.append(); });

  run(function() { view.set('show', true); });

  ok(elementOnDidChange, "should have an element on change");
  ok(elementOnDidInsert, "should have an element on insert");

  run(function() { view.destroy(); });
});

test("trigger rerender of parent and SimpleHandlebarsView", function () {
  var view = EmberView.create({
    show: true,
    foo: 'bar',
    template: EmberHandlebars.compile("{{#if view.show}}{{#if view.foo}}{{view.foo}}{{/if}}{{/if}}")
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

test("re-rendering and then changing the property does not raise an exception", function() {
  view = EmberView.create({
    show: true,
    foo: 'bar',
    metamorphView: _MetamorphView,
    template: EmberHandlebars.compile("{{#view view.metamorphView}}truth{{/view}}")
  });

  run(function() { view.appendTo('#qunit-fixture'); });

  equal(view.$().text(), 'truth');

  run(function() {
    view.get('_childViews')[0].rerender();
    view.get('_childViews')[0].rerender();
  });

  equal(view.$().text(), 'truth');

  run(function() {
    view.destroy();
  });
});
