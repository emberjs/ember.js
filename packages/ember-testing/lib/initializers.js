Ember.onLoad('Ember.Application', function(Application) {
  if (Ember.FEATURES.isEnabled('ember-testing-lazy-routing')){
    Application.initializer({
      name: 'deferReadiness in `testing` mode',

      initialize: function(container, application){
        if (application.testing) {
          application.deferReadiness();
        }
      }
    });
  }
});
