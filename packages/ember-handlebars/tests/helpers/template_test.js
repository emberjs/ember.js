var MyApp;
var originalLookup = Ember.lookup, lookup, TemplateTests, view, container;

module("Support for {{template}} helper", {
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

test("should render other templates via the container (DEPRECATED)", function() {
  container.register('template:sub_template_from_container', Ember.Handlebars.compile('sub-template'));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('This {{template "sub_template_from_container"}} is pretty great.')
  });

  expectDeprecation(/The `template` helper has been deprecated in favor of the `partial` helper./);

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "This sub-template is pretty great.");
});

test("should use the current view's context (DEPRECATED)", function() {
  container.register('template:person_name', Ember.Handlebars.compile("{{firstName}} {{lastName}}"));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('Who is {{template "person_name"}}?')
  });
  view.set('controller', Ember.Object.create({
    firstName: 'Kris',
    lastName: 'Selden'
  }));

  expectDeprecation(/The `template` helper has been deprecated in favor of the `partial` helper./);

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "Who is Kris Selden?");
});
