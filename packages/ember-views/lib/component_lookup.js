import Ember from 'ember-metal/core';
import EmberObject from "ember-runtime/system/object";
import { ISNT_HELPER_CACHE } from "ember-htmlbars/system/lookup-helper";

export default EmberObject.extend({
  invalidName(name) {
    var invalidName = ISNT_HELPER_CACHE.get(name);

    if (invalidName) {
      Ember.assert(`You cannot use '${name}' as a component name. Component names must contain a hyphen.`);
    }
  },

  lookupFactory(name, container) {

    container = container || this.container;

    var fullName = 'component:' + name;
    var templateFullName = 'template:components/' + name;
    var templateRegistered = container && container._registry.has(templateFullName);

    if (templateRegistered) {
      container._registry.injection(fullName, 'layout', templateFullName);
    }

    var Component = container.lookupFactory(fullName);

    // Only treat as a component if either the component
    // or a template has been registered.
    if (templateRegistered || Component) {
      if (!Component) {
        container._registry.register(fullName, Ember.Component);
        Component = container.lookupFactory(fullName);
      }
      return Component;
    }
  },

  componentFor(name, container) {
    if (this.invalidName(name)) {
      return;
    }

    var fullName = 'component:' + name;
    return container.lookupFactory(fullName);
  },

  layoutFor(name, container) {
    if (this.invalidName(name)) {
      return;
    }

    var templateFullName = 'template:components/' + name;
    return container.lookup(templateFullName);
  }
});
