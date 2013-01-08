var buildContainer = function(namespace) {
  var container = new Ember.Container();

  container.set = Ember.set;
  container.resolver = resolverFor(namespace);
  container.optionsForType('view', { singleton: false });
  container.register('application', 'main', namespace, { instantiate: false });

  return container;
};

function resolverFor(namespace) {
  return function(fullName) {
    var nameParts = fullName.split(":"),
        type = nameParts[0], name = nameParts[1];

    var className = Ember.String.classify(name) + Ember.String.classify(type);
    var factory = Ember.get(namespace, className);

    if (factory) { return factory; }
  };
}

var container, appController;

module("Ember.controllerFor", {
  setup: function() {
    var namespace = Ember.Namespace.create();
    container = buildContainer(namespace);
    container.register('controller', 'app', Ember.Controller.extend());
    appController = container.lookup('controller:app');
  },
  teardown: function() {
    Ember.run(function () {
      if (container) {
        container.destroy();
      }
    });
  }
});

test("controllerFor should lookup for registered controllers", function() {
  var controller = Ember.controllerFor(container, 'app');

  equal(appController, controller, 'should find app controller');
});

test("controllerFor should create Ember.Controller", function() {
  var controller = Ember.controllerFor(container, 'home');

  ok(controller instanceof Ember.Controller, 'should create controller');
});

test("controllerFor should create Ember.ObjectController", function() {
  var context = {};
  var controller = Ember.controllerFor(container, 'home', context);

  ok(controller instanceof Ember.ObjectController, 'should create controller');
  equal(controller.get('content'), context, 'should set content');
});

test("controllerFor should create Ember.ArrayController", function() {
  var context = Ember.A();
  var controller = Ember.controllerFor(container, 'home', context);

  ok(controller instanceof Ember.ArrayController, 'should create controller');
  equal(controller.get('content'), context, 'should set content');
});
