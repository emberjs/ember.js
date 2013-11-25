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

  if (Ember.FEATURES.isEnabled('ember-testing-simple-setup')){
    Application.initializer({
      name: 'setupForTesting and injectTestHelpers when created with testing = true',

      initialize: function(container, application){
        if (application.testing && !application.testingSetup) {
          application.setupForTesting();
          application.injectTestHelpers();
        }
      }
    });
  }
});
