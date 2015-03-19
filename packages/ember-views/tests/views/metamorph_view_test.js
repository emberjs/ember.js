import jQuery from "ember-views/system/jquery";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import compile from "ember-template-compiler/system/compile";
import _MetamorphView from "ember-views/views/metamorph_view";

var view, childView, metamorphView;

QUnit.module("Metamorph views", {
  setup() {
    view = EmberView.create({
      render(buffer) {
        buffer.push("<h1>View</h1>");
        this.appendChild(metamorphView);
      }
    });
  },

  teardown() {
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

QUnit.skip("a Metamorph view is not a view's parentView", function() {
  childView = EmberView.create({
    render(buffer) {
      buffer.push("<p>Bye bros</p>");
    }
  });

  metamorphView = _MetamorphView.create({
    render(buffer) {
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
  setup() {
    view = EmberView.create({
      render(buffer) {
        buffer.push("<h1>View</h1>");
        this.appendChild(metamorphView);
      }
    });

    metamorphView = _MetamorphView.create({
      powerRanger: "Jason",

      render(buffer) {
        buffer.push("<h2 id='from-meta'>"+get(this, 'powerRanger')+"</h2>");
      }
    });

    run(function() {
      view.appendTo("#qunit-fixture");
    });
  },

  teardown() {
    run(function() {
      view.destroy();
      if (!metamorphView.isDestroyed) {
        metamorphView.destroy();
      }
    });
  }
});

QUnit.skip("a metamorph view generates without a DOM node", function() {
  var meta = jQuery("> h2", "#" + get(view, 'elementId'));

  equal(meta.length, 1, "The metamorph element should be directly inside its parent");
});

QUnit.test("a metamorph view can be removed from the DOM", function() {
  run(function() {
    metamorphView.destroy();
  });

  var meta = jQuery('#from-morph');
  equal(meta.length, 0, "the associated DOM was removed");
});

QUnit.skip("a metamorph view can be rerendered", function() {
  equal(jQuery('#from-meta').text(), "Jason", "precond - renders to the DOM");

  set(metamorphView, 'powerRanger', 'Trini');
  run(function() {
    metamorphView.rerender();
  });

  equal(jQuery('#from-meta').text(), "Trini", "updates value when re-rendering");
});


// Redefining without setup/teardown
QUnit.module("Metamorph views correctly handle DOM");

QUnit.skip("a metamorph view calls its children's willInsertElement and didInsertElement", function() {
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

QUnit.test("replacing a Metamorph should invalidate childView elements", function() {
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

QUnit.test("re-rendering and then changing the property does not raise an exception", function() {
  view = EmberView.create({
    show: true,
    foo: 'bar',
    metamorphView: _MetamorphView,
    template: compile("{{#view view.metamorphView}}truth{{/view}}")
  });

  run(function() { view.appendTo('#qunit-fixture'); });

  equal(view.$().text(), 'truth');

  run(function() {
    view.childViews[0].rerender();
    view.childViews[0].rerender();
  });

  equal(view.$().text(), 'truth');

  run(function() {
    view.destroy();
  });
});
