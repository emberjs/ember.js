import { onLoad } from "ember-runtime/system/lazy_load";
import RoutingService from "ember-routing/services/routing";

onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: 'routing-service',
    initialize(registry) {
      // Register the routing service...
      registry.register('service:-routing', RoutingService);
      // Then inject the app router into it
      registry.injection('service:-routing', 'router', 'router:main');
    }
  });
});
