/*global QUnit*/
var container, view;

module("Handlebars {{control}} helper", {
  setup: function() {
    container = new Ember.Container();
    container.options('template', { instantiate: false });
    container.options('view', { singleton: false });
    container.register('controller:parent', Ember.Controller.extend());
    container.register('controller:widget', Ember.Controller.extend());
    container.register('view:widget', Ember.View.extend());
  },

  teardown: function() {
    destroy(view);
    destroy(container);
  }
});

var compile = Ember.Handlebars.compile;

function destroy(object) {
  Ember.run(function() {
    object.destroy();
  });
}

function appendView(attrs) {
  view = Ember.View.create(attrs);
  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });
}

function renderedText(expected, msg) {
  var actual = view.$().text();
  QUnit.push(actual === expected, actual, expected, msg);
}

test("A control raises an error when a view cannot be found", function() {
  container = new Ember.Container();
  container.options('template', { instantiate: false });
  container.options('view', { singleton: false });
  container.register('controller:parent', Ember.Controller.extend());
  container.register('controller:widget', Ember.Controller.extend());
  container.register('template:widget', compile("Hello"));

  throws(function() {
    appendView({
      controller: container.lookup('controller:parent'),
      template: compile("{{control widget}}")
    });
  }, /find view/, "Must raise an error if no view is defined");
});

test("A control raises an error when a controller cannot be found", function() {
  container = new Ember.Container();
  container.options('template', { instantiate: false });
  container.options('view', { singleton: false });
  container.register('controller:parent', Ember.Controller.extend());
  container.register('view:widget', Ember.View.extend());
  container.register('template:widget', compile("Hello"));

  throws(function() {
    appendView({
      controller: container.lookup('controller:parent'),
      template: compile("{{control widget}}")
    });
  }, /find controller/, "Must raise an error when no controller is defined");

  // The assertion causes some views to be left behind
  Ember.run(function() {
    for (var viewId in Ember.View.views) {
      Ember.View.views[viewId].destroy();
    }
  });
});

test("A control renders a template with a new instance of the named controller and view", function() {
  container.register('template:widget', compile("Hello"));

  appendView({
    controller: container.lookup('controller:parent'),
    template: compile("{{control widget}}")
  });

  renderedText("Hello");
});

test("A control's controller and view are lookuped up via template name", function() {
  container.register('template:widgets/foo', compile("Hello"));
  container.register('controller:widgets.foo', Ember.Controller.extend());
  container.register('view:widgets.foo', Ember.View.extend());

  appendView({
    controller: container.lookup('controller:parent'),
    template: compile("{{control 'widgets/foo'}}")
  });

  renderedText("Hello");
});

test("A control defaults to the default view", function() {
  container.register('template:widgets/foo', compile("Hello"));
  container.register('controller:widgets.foo', Ember.Controller.extend());
  container.register('view:default', Ember.View.extend());

  appendView({
    controller: container.lookup('controller:parent'),
    template: compile("{{control 'widgets/foo'}}")
  });

  renderedText("Hello");
});

test("A control with a default view survives re-render", function() {
  container.register('template:widgets/foo', compile("Hello"));
  container.register('controller:widgets.foo', Ember.Controller.extend());
  container.register('view:default', Ember.View.extend());

  appendView({
    controller: container.lookup('controller:parent'),
    template: compile("{{control 'widgets/foo'}}")
  });

  renderedText("Hello");

  Ember.run(function() {
    view.rerender();
  });

  renderedText("Hello");
});

test("A control can specify a model to use in its template", function() {
  container.register('template:widget', compile("{{model.name}}"));

  var controller = container.lookup('controller:parent');
  controller.set('person', { name: "Tom Dale" });

  appendView({
    controller: controller,
    template: compile("{{control 'widget' person}}")
  });

  renderedText("Tom Dale");
});

test("A control can be used multiple times", function() {
  container.register('template:widget', compile("{{model.name}}"));

  var controller = container.lookup('controller:parent');
  controller.set('person1', { name: "Tom Dale" });
  controller.set('person2', { name: "Peter Wagenet" });

  appendView({
    controller: controller,
    template: compile("{{control 'widget' person1}}{{control 'widget' person2}}")
  });

  renderedText("Tom DalePeter Wagenet");
});

test("A control can be nested", function() {
  container.register('template:widget', compile("{{model.name}}{{#if model.submodel}}{{control 'widget' model.submodel}}{{/if}}"));

  var controller = container.lookup('controller:parent');
  controller.set('person', {
    name: "Tom Dale",
    submodel: { name: "Yehuda Katz" }
  });

  appendView({
    controller: controller,
    template: compile("{{control 'widget' person}}")
  });

  renderedText("TomDaleYehuda Katz");
});

test("A control's state is persisted if the view is destroyed and re-rendered", function() {
  container.register('template:widget', compile("{{randomValue}}{{model.name}}"));

  var controller = container.lookup('controller:parent');
  controller.set('person1', { name: "Tom Dale" });
  controller.set('person2', { name: "Peter Wagenet" });

  container.register('controller:widget', Ember.Controller.extend({
    randomValue: Ember.computed(function() {
      return Math.random() + '' + (+new Date());
    })
  }));

  var template = compile("{{control 'widget' person1}}{{control 'widget' person2}}");

  appendView({
    controller: controller,
    template: template
  });

  var text = view.$().text();
  ok(text.match(/^.*Tom Dale.*Peter Wagenet.*$/), "The view rendered");

  destroy(view);

  appendView({
    controller: controller,
    template: template
  });

  equal(view.$().text(), text);
});

test("if a controller's model changes, its child controllers are destroyed", function() {
  container.register('template:widget', compile("{{randomValue}}{{model.name}}"));

  var controller = container.lookup('controller:parent');
  controller.set('model', { name: "Tom Dale" });

  container.register('controller:widget', Ember.Controller.extend({
    randomValue: Ember.computed(function() {
      return Math.random() + '' + (+new Date());
    })
  }));

  appendView({
    controller: controller,
    template: compile("{{control 'widget' model}}")
  });

  var childController = view.get('childViews').objectAt(0).get('controller');

  ok(view.$().text().match(/^.*Tom Dale.*$/), "The view rendered");
  deepEqual(childController.get('model'), { name: "Tom Dale" });

  Ember.run(function() {
    controller.set('model', { name: "Yehuda Katz" });
  });

  equal(childController.isDestroying, true);
  ok(view.$().text().match(/^.*Yehuda Katz.*$/), "The view rendered");
});

test("A control should correctly remove model observers", function() {
  var Controller = Ember.Controller.extend({
    message: 'bro'
  });

  container.register('template:widget', compile("{{content}}"));
  container.register('controller:bro', Controller);

  appendView({
    controller: container.lookup('controller:bro'),
    template: compile("{{control widget message}}")
  });

  renderedText("bro");

  Ember.run(function() {
    view.destroy();
  });

  Ember.run(function() {
    Ember.set(container.lookup('controller:bro'), 'message', 'grammer');
  });
});
