var set = Ember.set;

Ember.onLoad('application', function(app) {
  app.registerInjection({
    name: "store",
    before: "controllers",

    injection: function(app, stateManager, property) {
      if (property === 'Store') {
        set(stateManager, 'store', app[property].create());
      }
    }
  });
});
