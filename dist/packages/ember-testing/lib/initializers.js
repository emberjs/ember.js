import { onLoad } from '@ember/application';
let name = 'deferReadiness in `testing` mode';
onLoad('Ember.Application', function (ApplicationClass) {
  if (!ApplicationClass.initializers[name]) {
    ApplicationClass.initializer({
      name: name,
      initialize(application) {
        if (application.testing) {
          application.deferReadiness();
        }
      }
    });
  }
});