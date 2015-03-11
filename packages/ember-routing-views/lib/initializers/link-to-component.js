import { onLoad } from "ember-runtime/system/lazy_load";
import linkToComponent from "ember-routing-views/views/link";

onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: 'link-to-component',
    initialize: function(registry) {
      registry.register('component:-link-to', linkToComponent);
    }
  });
});

