import Registry from "container/registry";
import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import { compile } from "ember-template-compiler";

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

QUnit.test("Template views return throw if their template cannot be found", function() {
  view = EmberView.create({
    templateName: 'cantBeFound',
    container: { lookup() { } }
  });

  expectAssertion(function() {
    get(view, 'template');
  }, /cantBeFound/);
});

QUnit.test("should call the function of the associated template", function() {
  registry.register('template:testTemplate', compile(
    "<h1 id='twas-called'>template was called</h1>"
  ));

  view = EmberView.create({
    container: container,
    templateName: 'testTemplate'
  });

  run(function() {
    view.createElement();
  });

  ok(view.$('#twas-called').length, "the named template was called");
});

QUnit.test("should call the function of the associated template with itself as the context", function() {
  registry.register('template:testTemplate', compile(
    "<h1 id='twas-called'>template was called for {{personName}}</h1>"
  ));

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

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(),
        "the named template was called with the view as the data source");
});

QUnit.test("should fall back to defaultTemplate if neither template nor templateName are provided", function() {
  var View;

  View = EmberView.extend({
    defaultTemplate: compile(
      "<h1 id='twas-called'>template was called for {{personName}}</h1>"
    )
  });

  view = View.create({
    context: {
      personName: "Tom DAAAALE"
    }
  });

  run(function() {
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(),
        "the named template was called with the view as the data source");
});

QUnit.test("should not use defaultTemplate if template is provided", function() {
  var View = EmberView.extend({
    template: compile("foo"),
    defaultTemplate: compile(
      "<h1 id='twas-called'>template was called for {{personName}}</h1>"
    )
  });

  view = View.create();
  run(function() {
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

QUnit.test("should not use defaultTemplate if template is provided", function() {
  registry.register('template:foobar', compile("foo"));

  var View = EmberView.extend({
    container: container,
    templateName: 'foobar',
    defaultTemplate: compile(
      "<h1 id='twas-called'>template was called for {{personName}}</h1>"
    )
  });

  view = View.create();
  run(function() {
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

QUnit.test("should render an empty element if no template is specified", function() {
  view = EmberView.create();
  run(function() {
    view.createElement();
  });

  equal(view.$().text(), '', "view div should be empty");
});

QUnit.test("should throw an assertion if no container has been set", function() {
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

  view.renderNode = null;
});
