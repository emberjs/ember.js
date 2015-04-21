import Registry from "container/registry";
import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";

var registry, container, view;

QUnit.module("EmberView - Layout Functionality", {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('template', { instantiate: false });
  },

  teardown() {
    run(function() {
      view.destroy();
      container.destroy();
    });
    registry = container = view = null;
  }
});

QUnit.test("Layout views return throw if their layout cannot be found", function() {
  view = EmberView.create({
    layoutName: 'cantBeFound',
    container: { lookup() { } }
  });

  expectAssertion(function() {
    get(view, 'layout');
  }, /cantBeFound/);
});

QUnit.test("should call the function of the associated layout", function() {
  var templateCalled = 0;
  var layoutCalled = 0;

  registry.register('template:template', function() { templateCalled++; });
  registry.register('template:layout', function() { layoutCalled++; });

  view = EmberView.create({
    container: container,
    layoutName: 'layout',
    templateName: 'template'
  });

  run(function() {
    view.createElement();
  });

  equal(templateCalled, 0, "template is not called when layout is present");
  equal(layoutCalled, 1, "layout is called when layout is present");
});

QUnit.test("changing layoutName after setting layoutName continous to work", function() {
  var layoutCalled = 0;
  var otherLayoutCalled = 0;

  registry.register('template:layout', function() { layoutCalled++; });
  registry.register('template:other-layout', function() { otherLayoutCalled++; });

  view = EmberView.create({
    container: container,
    layoutName: 'layout'
  });

  run(view, 'createElement');
  equal(layoutCalled, 1, "layout is called when layout is present");
  equal(otherLayoutCalled, 0, "otherLayout is not yet called");

  run(() => {
    view.set('layoutName', 'other-layout');
    view.rerender();
  });

  equal(layoutCalled, 1, "layout is called when layout is present");
  equal(otherLayoutCalled, 1, "otherLayoutis called when layoutName changes, and explicit rerender occurs");
});

QUnit.test("changing layoutName after setting layout CP continous to work", function() {
  var layoutCalled = 0;
  var otherLayoutCalled = 0;
  function otherLayout() {
    otherLayoutCalled++;
  }

  registry.register('template:other-layout', otherLayout);

  view = EmberView.create({
    container: container,
    layout() {
      layoutCalled++;
    }
  });

  run(view, 'createElement');
  run(() => {
    view.set('layoutName', 'other-layout');
    view.rerender();
  });

  equal(view.get('layout'), otherLayout);

  equal(layoutCalled, 1, "layout is called when layout is present");
  equal(otherLayoutCalled, 1, "otherLayoutis called when layoutName changes, and explicit rerender occurs");
});

QUnit.test("should call the function of the associated template with itself as the context", function() {
  registry.register('template:testTemplate', function(dataSource) {
    return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>";
  });

  view = EmberView.create({
    container: container,
    layoutName: 'testTemplate',

    context: {
      personName: "Tom DAAAALE"
    }
  });

  run(function() {
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

QUnit.test("should fall back to defaultTemplate if neither template nor templateName are provided", function() {
  var View;

  View = EmberView.extend({
    defaultLayout(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create({
    context: {
      personName: "Tom DAAAALE"
    }
  });

  run(function() {
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

QUnit.test("should not use defaultLayout if layout is provided", function() {
  var View;

  View = EmberView.extend({
    layout() { return "foo"; },
    defaultLayout(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  run(function() {
    view.createElement();
  });


  equal("foo", view.$().text(), "default layout was not printed");
});

QUnit.test("the template property is available to the layout template", function() {
  view = EmberView.create({
    template(context, options) {
      options.data.buffer.push(" derp");
    },

    layout(context, options) {
      options.data.buffer.push("Herp");
      get(options.data.view, 'template')(context, options);
    }
  });

  run(function() {
    view.createElement();
  });

  equal("Herp derp", view.$().text(), "the layout has access to the template");
});

