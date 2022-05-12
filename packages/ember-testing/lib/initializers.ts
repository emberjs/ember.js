import { onLoad } from '@ember/application';
import type Application from '@ember/application';
import type { TestableApp } from './ext/application';

let name = 'deferReadiness in `testing` mode';

onLoad('Ember.Application', function (ApplicationClass: typeof Application) {
  if (!ApplicationClass.initializers[name]) {
    ApplicationClass.initializer({
      name: name,

      initialize(application) {
        if ((application as TestableApp).testing) {
          application.deferReadiness();
        }
      },
    });
  }
});
