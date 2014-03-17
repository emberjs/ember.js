var buildContainer = function(namespace) {
  var container = new Ember.Container();

  container.set = Ember.set;
  container.resolver = resolverFor(namespace);
  container.optionsForType('view', { singleton: false });

  container.register('application:main', namespace, { instantiate: false });

  container.register('controller:basic', Ember.Controller, { instantiate: false });
  container.register('controller:object', Ember.ObjectController, { instantiate: false });
  container.register('controller:array', Ember.ArrayController, { instantiate: false });

  return container;
};

function resolverFor(namespace) {
  return function(fullName) {
    var nameParts = fullName.split(":"),
        type = nameParts[0], name = nameParts[1];

    if (name === 'basic') {
      name = '';
    }
    var className = Ember.String.classify(name) + Ember.String.classify(type);
    var factory = Ember.get(namespace, className);



    if (factory) { return factory; }
  };
}

var container, appController, namespace;

module("Ember.controllerFor", {
  setup: function() {
    namespace = Ember.Namespace.create();
    container = buildContainer(namespace);
    container.register('controller:app', Ember.Controller.extend());
    appController = container.lookup('controller:app');
  },
  teardown: function() {
    Ember.run(function () {
      container.destroy();
      namespace.destroy();
    });
  }
});

test("controllerFor should lookup for registered controllers", function() {
  var controller = Ember.controllerFor(container, 'app');

  equal(appController, controller, 'should find app controller');
});

module("Ember.generateController", {
  setup: function() {
    namespace = Ember.Namespace.create();
    container = buildContainer(namespace);
  },
  teardown: function() {
    Ember.run(function () {
      container.destroy();
      namespace.destroy();
    });
  }
});

test("generateController should create Ember.Controller", function() {
  var controller = Ember.generateController(container, 'home');

  ok(controller instanceof Ember.Controller, 'should create controller');
});

test("generateController should create Ember.ObjectController", function() {
  var context = {};
  var controller = Ember.generateController(container, 'home', context);

  ok(controller instanceof Ember.ObjectController, 'should create controller');
});

test("generateController should create Ember.ArrayController", function() {
  var context = Ember.A();
  var controller = Ember.generateController(container, 'home', context);

  ok(controller instanceof Ember.ArrayController, 'should create controller');
});

test("generateController should create App.Controller if provided", function() {
  var controller;
  namespace.Controller = Ember.Controller.extend();

  controller = Ember.generateController(container, 'home');

  ok(controller instanceof namespace.Controller, 'should create controller');
});

test("generateController should create App.ObjectController if provided", function() {
  var context = {}, controller;
  namespace.ObjectController = Ember.ObjectController.extend();

  controller = Ember.generateController(container, 'home', context);

  ok(controller instanceof namespace.ObjectController, 'should create controller');

});

test("generateController should create App.ArrayController if provided", function() {
  var context = Ember.A(), controller;
  namespace.ArrayController = Ember.ArrayController.extend();

  controller = Ember.generateController(container, 'home', context);

  ok(controller instanceof namespace.ArrayController, 'should create controller');

});
