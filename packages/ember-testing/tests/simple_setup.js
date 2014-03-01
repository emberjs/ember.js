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
