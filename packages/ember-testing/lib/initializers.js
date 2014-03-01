Ember.onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: 'deferReadiness in `testing` mode',

    initialize: function(container, application){
      if (application.testing) {
        application.deferReadiness();
      }
    }
  });
});
