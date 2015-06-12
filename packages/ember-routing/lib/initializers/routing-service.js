import { onLoad } from 'ember-runtime/system/lazy_load';
import RoutingService from 'ember-routing/services/routing';

onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: 'routing-service',
    initialize(application) {
      // Register the routing service...
      application.register('service:-routing', RoutingService);
      // Then inject the app router into it
      application.inject('service:-routing', 'router', 'router:main');
    }
  });
});
