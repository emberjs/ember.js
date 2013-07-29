var MyApp;
var originalLookup = Ember.lookup, lookup, TemplateTests, view, container;

module("Support for {{template}} helper", {
  setup: function() {
    Ember.TESTING_DEPRECATION = true;

    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = Ember.Object.create({});
    container = new Ember.Container();
    container.optionsForType('template', { instantiate: false });
    Ember.TESTING_DEPRECATION = true;
  },
  teardown: function() {
    Ember.TESTING_DEPRECATION = false;
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });
    Ember.lookup = originalLookup;

    Ember.TESTING_DEPRECATION = false;
  }
});

test("should render other templates via the container", function() {
  container.register('template:sub_template_from_container', Ember.Handlebars.compile('sub-template'));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('This {{template "sub_template_from_container"}} is pretty great.')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "This sub-template is pretty great.");
});

test("should use the current view's context", function() {
  container.register('template:person_name', Ember.Handlebars.compile("{{firstName}} {{lastName}}"));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('Who is {{template "person_name"}}?')
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
