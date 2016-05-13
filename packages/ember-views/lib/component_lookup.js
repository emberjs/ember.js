import { assert } from 'ember-metal/debug';
import EmberObject from 'ember-runtime/system/object';

export default EmberObject.extend({
  componentFor(name, owner, options) {
    assert(`You cannot use '${name}' as a component name. Component names must contain a hyphen.`, ~name.indexOf('-'));

    let fullName = 'component:' + name;
    return owner._lookupFactory(fullName, options);
  },

  layoutFor(name, owner, options) {
    assert(`You cannot use '${name}' as a component name. Component names must contain a hyphen.`, ~name.indexOf('-'));

    let templateFullName = 'template:components/' + name;
    return owner.lookup(templateFullName, options);
  }
});
