import Container from "container";
import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import EmberView from "ember-views/views/view";

var container, view;

QUnit.module("EmberView - Template Functionality", {
  setup: function() {
    container = new Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    run(function() {
      if (view) { view.destroy(); }
    });
  }
});

test("Template views return throw if their template cannot be found", function() {
  view = EmberView.create({
    templateName: 'cantBeFound',
    container: { lookup: function() { }}
  });

  expectAssertion(function() {
    get(view, 'template');
  }, /cantBeFound/);
});

test("should allow standard Handlebars template usage", function() {
  view = EmberView.create({
    context: { name: "Erik" },
    template: Handlebars.compile("Hello, {{name}}")
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().text(), "Hello, Erik");
});

test("should call the function of the associated template", function() {
  container.register('template:testTemplate', function() {
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

test("should call the function of the associated template with itself as the context", function() {
  container.register('template:testTemplate', function(dataSource) {
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

test("should fall back to defaultTemplate if neither template nor templateName are provided", function() {
  var View;

  View = EmberView.extend({
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
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

test("should not use defaultTemplate if template is provided", function() {
  var View;

  View = EmberView.extend({
    template:  function() { return "foo"; },
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  run(function() {
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

test("should not use defaultTemplate if template is provided", function() {
  var View;

  container.register('template:foobar', function() { return 'foo'; });

  View = EmberView.extend({
    container: container,
    templateName: 'foobar',
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  run(function() {
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

test("should render an empty element if no template is specified", function() {
  view = EmberView.create();
  run(function() {
    view.createElement();
  });

  equal(view.$().html(), '', "view div should be empty");
});

test("should provide a controller to the template if a controller is specified on the view", function() {
  expect(7);

  var Controller1 = EmberObject.extend({
    toString: function() { return "Controller1"; }
  });

  var Controller2 = EmberObject.extend({
    toString: function() { return "Controller2"; }
  });

  var controller1 = Controller1.create();
  var controller2 = Controller2.create();
  var optionsDataKeywordsControllerForView;
  var optionsDataKeywordsControllerForChildView;
  var contextForView;
  var contextForControllerlessView;

  view = EmberView.create({
    controller: controller1,

    template: function(buffer, options) {
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

    template: function(buffer, options) {
      options.data.view.appendChild(EmberView.create({
        controller: controller2,
        template: function(context, options) {
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

    template: function(buffer, options) {
      options.data.view.appendChild(EmberView.create({
        template: function(context, options) {
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

test("should throw an assertion if no container has been set", function() {
  expect(1);
  var View;

  View = EmberView.extend({
    templateName: 'foobar'
  });

  raises(function() {
    view = View.create();
    run(function() {
      view.createElement();
    });
  }, /Container was not found when looking up a views template./);
});
