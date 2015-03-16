import { onLoad } from "ember-runtime/system/lazy_load";
import TextField from "ember-views/views/text_field";
import Checkbox from "ember-views/views/checkbox";

onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: 'ember-views-components',
    initialize(registry) {
      registry.register('component:-text-field', TextField);
      registry.register('component:-checkbox', Checkbox);
    }
  });
});

