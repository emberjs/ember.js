var get = Ember.get;

Ember.ControllerMixin.reopen({
  transitionTo: function() {
    var router = get(this, 'target');

    return router.transitionTo.apply(router, arguments);
  },

  controllerFor: function(controllerName) {
    var container = get(this, 'container');
    return container.lookup('controller:' + controllerName);
  }
});
