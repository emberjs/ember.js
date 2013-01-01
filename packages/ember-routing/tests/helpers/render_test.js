var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var compile = function(template) {
  return Ember.Handlebars.compile(template);
};

var buildContainer = function(namespace) {
  var container = new Ember.Container();

  container.set = Ember.set;
  container.resolve = resolveFor(namespace);
  container.optionsForType('view', { singleton: false });
  container.optionsForType('template', { instantiate: false });
  container.register('application', 'main', namespace, { instantiate: false });
  container.injection('router:main', 'namespace', 'application:main');

  container.typeInjection('route', 'router', 'router:main');

  return container;
};

function resolveFor(namespace) {
  return function(fullName) {
    var nameParts = fullName.split(":"),
        type = nameParts[0], name = nameParts[1];

    if (type === 'template') {
      var templateName = Ember.String.decamelize(name);
      if (Ember.TEMPLATES[templateName]) {
        return Ember.TEMPLATES[templateName];
      }
    }

    var className = Ember.String.classify(name) + Ember.String.classify(type);
    var factory = Ember.get(namespace, className);

    if (factory) { return factory; }

    return Ember.Container.prototype.resolve.call(this, fullName);
  };
}

var view, container;

module("Handlebars {{render}} helper", {
  setup: function() {
    var namespace = Ember.Namespace.create();
    container = buildContainer(namespace);
    container.register('view', 'default', Ember.View.extend());
    container.register('router', 'main', Ember.Router.extend());
  },
  teardown: function() {
    Ember.run(function () {
      if (container) {
        container.destroy();
      }
      if (view) {
        view.destroy();
      }
    });
  }
});

test("{{render}} helper should render given template", function() {
  var template = "<h1>HI</h1>{{render home}}";
  var controller = Ember.Controller.extend({container: container});
  view = Ember.View.create({
    controller: controller.create(),
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  appendView(view);

  equal(view.$().text(), 'HIBYE');
  ok(container.lookup('router:main')._lookupActiveView('home'), 'should register home as active view');
});

test("{{render}} helper should render with given controller", function() {
  var template = '<h1>HI</h1>{{render home controller="posts"}}';
  var controller = Ember.Controller.extend({container: container});
  container.register('controller', 'posts', Ember.ArrayController.extend());
  view = Ember.View.create({
    controller: controller.create(),
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  appendView(view);

  var renderedView = container.lookup('router:main')._lookupActiveView('home');
  equal(container.lookup('controller:posts'), renderedView.get('controller'), 'rendered with correct controller');
});

test("{{render}} helper should render a template only once", function() {
  var template = "<h1>HI</h1>{{render home}}<hr/>{{render home}}";
  var controller = Ember.Controller.extend({container: container});
  view = Ember.View.create({
    controller: controller.create(),
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  raises(function() {
    appendView(view);
  }, 'should raise an exception');
});

test("{{render}} helper should be able to render a template again when it was removed", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  var controller = Ember.Controller.extend({container: container});
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  Ember.TEMPLATES['home'] = compile("<p>BYE</p>");

  appendView(view);

  Ember.run(function() {
    view.connectOutlet('main', Ember.View.create({
      controller: controller.create(),
      template: compile("<p>1{{render home}}</p>")
    }));
  });

  equal(view.$().text(), 'HI1BYE');

  Ember.run(function() {
    view.connectOutlet('main', Ember.View.create({
      controller: controller.create(),
      template: compile("<p>2{{render home}}</p>")
    }));
  });

  equal(view.$().text(), 'HI2BYE');
});
