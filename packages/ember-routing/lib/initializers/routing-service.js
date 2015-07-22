import { onLoad } from 'ember-runtime/system/lazy_load';
import RoutingService from 'ember-routing/services/routing';
import isEnabled from 'ember-metal/features';

let initialize;
if (isEnabled('ember-registry-container-reform')) {
  initialize = function(application) {
    // Register the routing service...
    application.register('service:-routing', RoutingService);
    // Then inject the app router into it
    application.inject('service:-routing', 'router', 'router:main');
  };
} else {
  initialize = function(registry, application) {
    // Register the routing service...
    registry.register('service:-routing', RoutingService);
    // Then inject the app router into it
    registry.injection('service:-routing', 'router', 'router:main');
  };
}

onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: 'routing-service',
    initialize
  });
});
