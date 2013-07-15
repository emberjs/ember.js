var set = Ember.set, get = Ember.get, view;

module("Ember.View - Old Router Functionality", {
  setup: function() {
    Ember.TEMPLATES = {};
  },
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("should load named templates from View.templates", function() {


  view = Ember.View.create({
    templates: {
      testTemplate: function() {
        return "<h1 id='old-router-template-was-called'>template was called</h1>";
      }
    },
    templateName: 'testTemplate'
  });

  Ember.run(function() {
    view.createElement();
  });

  ok(view.$('#old-router-template-was-called').length, "the named template was called");
});
