var set = Ember.set;

Ember.onLoad('application', function(app) {
  app.registerInjection(function(app, stateManager, property) {
    if (property === 'Store') {
      set(stateManager, 'store', app[property].create());
    }
  });
});
