import { onLoad } from "ember-runtime/system/lazy_load";

var name = 'deferReadiness in `testing` mode';

onLoad('Ember.Application', function(Application) {
  if (!Application.initializers[name]) {
    Application.initializer({
      name: name,

      initialize: function(container, application){
        if (application.testing) {
          application.deferReadiness();
        }
      }
    });
  }
});
