var MyApp;
var originalLookup = Ember.lookup, lookup, TemplateTests, view, container;

module("Support for {{partial}} helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = Ember.Object.create({});
    container = new Ember.Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });
    Ember.lookup = originalLookup;
  }
});

test("should render other templates registered with the container", function() {
  container.register('template:_subTemplateFromContainer', Ember.Handlebars.compile('sub-template'));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('This {{partial "subTemplateFromContainer"}} is pretty great.')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "This sub-template is pretty great.");
});

test("should render other slash-separated templates registered with the container", function() {
  container.register('template:child/_subTemplateFromContainer', Ember.Handlebars.compile("sub-template"));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('This {{partial "child/subTemplateFromContainer"}} is pretty great.')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "This sub-template is pretty great.");
});

test("should use the current view's context", function() {
  container.register('template:_person_name', Ember.Handlebars.compile("{{firstName}} {{lastName}}"));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('Who is {{partial "person_name"}}?')
  });
  view.set('controller', Ember.Object.create({
    firstName: 'Kris',
    lastName: 'Selden'
  }));

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "Who is Kris Selden?");
});
