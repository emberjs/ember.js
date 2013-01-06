var get = Ember.get;

Ember.ControllerMixin.reopen({
  transitionTo: function() {
    var router = get(this, 'target');

    return router.transitionTo.apply(router, arguments);
  }
});
