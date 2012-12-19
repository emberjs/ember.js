/*globals TemplateTests:true */

var get = Ember.get, getPath = Ember.getPath, set = Ember.set, group, rb, rb2, application;

var view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

module("Ember.Control", {
  setup: function() {
    window.TemplateTests = Ember.Namespace.create();
  },

  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
      view = null;
    }
    window.TemplateTests = undefined;
  }
});

test("a nested Ember.Control should use itself as its context", function() {
  TemplateTests.TestControl = Ember.Control.extend({
    location: 'Lake Tahoe',
    template: Ember.Handlebars.compile("{{location}}")
  });

  view = Ember.View.create({
    location: 'Seattle',
    template: Ember.Handlebars.compile("{{view TemplateTests.TestControl}}")
  });

  appendView();

  equal(view.$().text(), 'Lake Tahoe');
});