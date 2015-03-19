import Registry from "container/registry";
import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import EmberView from "ember-views/views/view";

var registry, container, view;

QUnit.module("EmberView - Template Functionality", {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('template', { instantiate: false });
  },
  teardown() {
    run(function() {
      if (view) { view.destroy(); }
      container.destroy();
      registry = container = view = null;
    });
  }
});

QUnit.skip("Template views return throw if their template cannot be found", function() {
  view = EmberView.create({
    templateName: 'cantBeFound',
    container: { lookup() { } }
  });

  expectAssertion(function() {
    get(view, 'template');
  }, /cantBeFound/);
});

if (typeof Handlebars === "object") {
  QUnit.skip("should allow standard Handlebars template usage", function() {
    view = EmberView.create({
      context: { name: "Erik" },
      template: Handlebars.compile("Hello, {{name}}")
    });

    run(function() {
      view.createElement();
    });

    equal(view.$().text(), "Hello, Erik");
  });
}

QUnit.skip("should call the function of the associated template", function() {
  registry.register('template:testTemplate', function() {
    return "<h1 id='twas-called'>template was called</h1>";
  });

  view = EmberView.create({
    container: container,
    templateName: 'testTemplate'
  });

  run(function() {
    view.createElement();
  });

  ok(view.$('#twas-called').length, "the named template was called");
});

QUnit.skip("should call the function of the associated template with itself as the context", function() {
  registry.register('template:testTemplate', function(dataSource) {
    return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>";
  });

  view = EmberView.create({
    container: container,
    templateName: 'testTemplate',

    context: {
      personName: "Tom DAAAALE"
    }
  });

  run(function() {
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

QUnit.skip("should fall back to defaultTemplate if neither template nor templateName are provided", function() {
  var View;

  View = EmberView.extend({
    defaultTemplate(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
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

QUnit.skip("should not use defaultTemplate if template is provided", function() {
  var View;

  View = EmberView.extend({
    template() { return "foo"; },
    defaultTemplate(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  run(function() {
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

QUnit.skip("should not use defaultTemplate if template is provided", function() {
  var View;

  registry.register('template:foobar', function() { return 'foo'; });

  View = EmberView.extend({
    container: container,
    templateName: 'foobar',
    defaultTemplate(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  run(function() {
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

QUnit.skip("should render an empty element if no template is specified", function() {
  view = EmberView.create();
  run(function() {
    view.createElement();
  });

  equal(view.$().html(), '', "view div should be empty");
});

QUnit.skip("should provide a controller to the template if a controller is specified on the view", function() {
  expect(7);

  var Controller1 = EmberObject.extend({
    toString() { return "Controller1"; }
  });

  var Controller2 = EmberObject.extend({
    toString() { return "Controller2"; }
  });

  var controller1 = Controller1.create();
  var controller2 = Controller2.create();
  var optionsDataKeywordsControllerForView;
  var optionsDataKeywordsControllerForChildView;
  var contextForView;
  var contextForControllerlessView;

  view = EmberView.create({
    controller: controller1,

    template(buffer, options) {
      optionsDataKeywordsControllerForView = options.data.view._keywords.controller.value();
    }
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the controller in the data");

  run(function() {
    view.destroy();
  });

  var parentView = EmberView.create({
    controller: controller1,

    template(buffer, options) {
      options.data.view.appendChild(EmberView.create({
        controller: controller2,
        template(context, options) {
          contextForView = context;
          optionsDataKeywordsControllerForChildView = options.data.view._keywords.controller.value();
        }
      }));
      optionsDataKeywordsControllerForView = options.data.view._keywords.controller.value();
    }
  });

  run(function() {
    parentView.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the controller in the data");
  strictEqual(optionsDataKeywordsControllerForChildView, controller2, "passes the child view's controller in the data");

  run(function() {
    parentView.destroy();
  });

  var parentViewWithControllerlessChild = EmberView.create({
    controller: controller1,

    template(buffer, options) {
      options.data.view.appendChild(EmberView.create({
        template(context, options) {
          contextForControllerlessView = context;
          optionsDataKeywordsControllerForChildView = options.data.view._keywords.controller.value();
        }
      }));
      optionsDataKeywordsControllerForView = options.data.view._keywords.controller.value();
    }
  });

  run(function() {
    parentViewWithControllerlessChild.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the original controller in the data");
  strictEqual(optionsDataKeywordsControllerForChildView, controller1, "passes the controller in the data to child views");
  strictEqual(contextForView, controller2, "passes the controller in as the main context of the parent view");
  strictEqual(contextForControllerlessView, controller1, "passes the controller in as the main context of the child view");

  run(function() {
    parentView.destroy();
    parentViewWithControllerlessChild.destroy();
  });
});

QUnit.skip("should throw an assertion if no container has been set", function() {
  expect(1);
  var View;

  View = EmberView.extend({
    templateName: 'foobar'
  });

  throws(function() {
    view = View.create();
    run(function() {
      view.createElement();
    });
  }, /Container was not found when looking up a views template./);
});
