import EmberComponent from 'ember-views/components/component';
import { assert } from 'ember-metal/debug';
import EmberObject from 'ember-runtime/system/object';
import { CONTAINS_DASH_CACHE } from 'ember-htmlbars/system/lookup-helper';
import { getOwner } from 'container/owner';

export default EmberObject.extend({
  invalidName(name) {
    if (!CONTAINS_DASH_CACHE.get(name)) {
      assert(`You cannot use '${name}' as a component name. Component names must contain a hyphen.`);
      return true;
    }
  },

  lookupFactory(name, owner) {
    owner = owner || getOwner(this);

    var fullName = 'component:' + name;
    var templateFullName = 'template:components/' + name;
    var templateRegistered = owner && owner.hasRegistration(templateFullName);

    if (templateRegistered) {
      owner.inject(fullName, 'layout', templateFullName);
    }

    var Component = owner._lookupFactory(fullName);

    // Only treat as a component if either the component
    // or a template has been registered.
    if (templateRegistered || Component) {
      if (!Component) {
        owner.register(fullName, EmberComponent);
        Component = owner._lookupFactory(fullName);
      }
      return Component;
    }
  },

  componentFor(name, owner) {
    if (this.invalidName(name)) {
      return;
    }

    var fullName = 'component:' + name;
    return owner._lookupFactory(fullName);
  },

  layoutFor(name, owner) {
    if (this.invalidName(name)) {
      return;
    }

    var templateFullName = 'template:components/' + name;
    return owner.lookup(templateFullName);
  }
});
