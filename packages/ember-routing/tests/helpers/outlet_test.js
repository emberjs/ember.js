var buildContainer = function(namespace) {
  var container = new Ember.Container();

  container.set = Ember.set;
  container.resolver = resolverFor(namespace);
  container.optionsForType('view', { singleton: false });
  container.optionsForType('template', { instantiate: false });
  container.register('application:main', namespace, { instantiate: false });
  container.injection('router:main', 'namespace', 'application:main');

  container.register('location:hash', Ember.HashLocation);

  container.register('controller:basic', Ember.Controller, { instantiate: false });
  container.register('controller:object', Ember.ObjectController, { instantiate: false });
  container.register('controller:array', Ember.ArrayController, { instantiate: false });

  container.typeInjection('route', 'router', 'router:main');

  return container;
};

function resolverFor(namespace) {
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
  };
}

var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var compile = Ember.Handlebars.compile;
var trim = Ember.$.trim;

var view, container;

module("Handlebars {{outlet}} helpers", {

  setup: function() {
    var namespace = Ember.Namespace.create();
    container = buildContainer(namespace);
    container.register('view:default', Ember.View.extend());
    container.register('router:main', Ember.Router.extend());
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

test("view should support connectOutlet for the main outlet", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    view.connectOutlet('main', Ember.View.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});

test("outlet should support connectOutlet in slots in prerender state", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  view.connectOutlet('main', Ember.View.create({
    template: compile("<p>BYE</p>")
  }));

  appendView(view);

  equal(view.$().text(), 'HIBYE');
});

test("outlet should support an optional name", function() {
  var template = "<h1>HI</h1>{{outlet mainView}}";
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    view.connectOutlet('mainView', Ember.View.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});


test("outlet should correctly lookup a view", function() {

  var template,
      ContainerView,
      childView;

  ContainerView = Ember.ContainerView.extend();

  container.register("view:containerView", ContainerView);

  template = "<h1>HI</h1>{{outlet view='containerView'}}";

  view = Ember.View.create({
    template: Ember.Handlebars.compile(template),
    container : container
  });

  childView = Ember.View.create({
    template: compile("<p>BYE</p>")
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    view.connectOutlet('main', childView);
  });

  ok(ContainerView.detectInstance(childView.get('_parentView')), "The custom view class should be used for the outlet");

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');

});

test("outlet should assert view is specified as a string", function() {

  var template = "<h1>HI</h1>{{outlet view=containerView}}";

  expectAssertion(function () {

    view = Ember.View.create({
      template: Ember.Handlebars.compile(template),
      container : container
    });

    appendView(view);

  });

});

test("outlet should assert view path is successfully resolved", function() {

  var template = "<h1>HI</h1>{{outlet view='someViewNameHere'}}";

  expectAssertion(function () {

    view = Ember.View.create({
      template: Ember.Handlebars.compile(template),
      container : container
    });

    appendView(view);

  });

});

test("outlet should correctly lookup a view", function() {

  var template,
      ContainerView,
      childView;

  ContainerView = Ember.ContainerView.extend();

  container.register("view:containerView", ContainerView);

  template = "<h1>HI</h1>{{outlet view='containerView'}}";

  view = Ember.View.create({
    template: Ember.Handlebars.compile(template),
    container : container
  });

  childView = Ember.View.create({
    template: compile("<p>BYE</p>")
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    view.connectOutlet('main', childView);
  });

  ok(ContainerView.detectInstance(childView.get('_parentView')), "The custom view class should be used for the outlet");

  // Replace whitespace for older IE
  equal(Ember.$.trim(view.$().text()), 'HIBYE');

});

test("outlet should assert view is specified as a string", function() {

  var template = "<h1>HI</h1>{{outlet view=containerView}}";

  expectAssertion(function () {

    view = Ember.View.create({
      template: Ember.Handlebars.compile(template),
      container : container
    });

    appendView(view);

  });

});

test("outlet should assert view path is successfully resolved", function() {

  var template = "<h1>HI</h1>{{outlet view='someViewNameHere'}}";

  expectAssertion(function () {

    view = Ember.View.create({
      template: Ember.Handlebars.compile(template),
      container : container
    });

    appendView(view);

  });

});

test("outlet should support an optional view class", function() {
  var template = "<h1>HI</h1>{{outlet viewClass=view.outletView}}";
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template),
    outletView: Ember.ContainerView.extend()
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  var childView = Ember.View.create({
    template: compile("<p>BYE</p>")
  });

  Ember.run(function() {
    view.connectOutlet('main', childView);
  });

  ok(view.outletView.detectInstance(childView.get('_parentView')), "The custom view class should be used for the outlet");

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});


test("Outlets bind to the current view, not the current concrete view", function() {
  var parentTemplate = "<h1>HI</h1>{{outlet}}";
  var middleTemplate = "<h2>MIDDLE</h2>{{outlet}}";
  var bottomTemplate = "<h3>BOTTOM</h3>";

  view = Ember.View.create({
    template: compile(parentTemplate)
  });

  var middleView = Ember._MetamorphView.create({
    template: compile(middleTemplate)
  });

  var bottomView = Ember._MetamorphView.create({
    template: compile(bottomTemplate)
  });

  appendView(view);

  Ember.run(function() {
    view.connectOutlet('main', middleView);
  });

  Ember.run(function() {
    middleView.connectOutlet('main', bottomView);
  });

  var output = Ember.$('#qunit-fixture h1 ~ h2 ~ h3').text();
  equal(output, "BOTTOM", "all templates were rendered");
});

test("view should support disconnectOutlet for the main outlet", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    view.connectOutlet('main', Ember.View.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');

  Ember.run(function() {
    view.disconnectOutlet('main');
  });

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HI');
});

test("Outlets bind to the current template's view, not inner contexts", function() {
  var parentTemplate = "<h1>HI</h1>{{#if view.alwaysTrue}}{{#with this}}{{outlet}}{{/with}}{{/if}}";
  var bottomTemplate = "<h3>BOTTOM</h3>";

  view = Ember.View.create({
    alwaysTrue: true,
    template: compile(parentTemplate)
  });

  var bottomView = Ember._MetamorphView.create({
    template: compile(bottomTemplate)
  });

  appendView(view);

  Ember.run(function() {
    view.connectOutlet('main', bottomView);
  });

  var output = Ember.$('#qunit-fixture h1 ~ h3').text();
  equal(output, "BOTTOM", "all templates were rendered");
});

test("should support layouts", function() {
  var template = "{{outlet}}",
      layout = "<h1>HI</h1>{{yield}}";
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template),
    layout: Ember.Handlebars.compile(layout)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    view.connectOutlet('main', Ember.View.create({
      template: compile("<p>BYE</p>")
    }));
  });
  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});
