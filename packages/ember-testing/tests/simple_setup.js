var App;

module('Simple Testing Setup', {
  teardown: function() {
    if (App) {
      App.removeTestHelpers();
      Ember.$('#ember-testing-container, #ember-testing').remove();
      Ember.run(App, 'destroy');
      App = null;
    }
  }
});

if (Ember.FEATURES.isEnabled('ember-testing-simple-setup')){
  test('testing is setup automatically, if the application is created with testing = true', function(){
    Ember.run(function(){
      App = Ember.Application.create({testing: true});
    });

    ok(Ember.keys(App.testHelpers).length > 0);
  });

  test('the test helper container can be supplied when creating the application', function(){
    var container = {};

    Ember.run(function(){
      App = Ember.Application.create({
        testing: true,
        helperContainer: container
      });
    });

    ok(Ember.keys(container).length > 0);
  });
}
