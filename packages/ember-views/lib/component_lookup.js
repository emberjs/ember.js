import Ember from 'ember-metal/core';
import { assert } from 'ember-metal/debug';
import EmberObject from 'ember-runtime/system/object';
import { CONTAINS_DASH_CACHE } from 'ember-htmlbars/system/lookup-helper';

export default EmberObject.extend({
  invalidName(name) {
    if (!CONTAINS_DASH_CACHE.get(name)) {
      assert(`You cannot use '${name}' as a component name. Component names must contain a hyphen.`);
      return true;
    }
  },

  lookupFactory(name, container) {
    container = container || this.container;

    var fullName = 'component:' + name;
    var templateFullName = 'template:components/' + name;
    var templateRegistered = container && container.registry.has(templateFullName);

    if (templateRegistered) {
      container.registry.injection(fullName, 'layout', templateFullName);
    }

    var Component = container.lookupFactory(fullName);

    // Only treat as a component if either the component
    // or a template has been registered.
    if (templateRegistered || Component) {
      if (!Component) {
        container.registry.register(fullName, Ember.Component);
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
