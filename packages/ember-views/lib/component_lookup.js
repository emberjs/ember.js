import { assert } from 'ember-metal';
import { Object as EmberObject } from 'ember-runtime';
import { FACTORY_FOR } from 'container';

export default EmberObject.extend({
  componentFor(name, owner, options) {
    assert(`You cannot use '${name}' as a component name. Component names must contain a hyphen.`, ~name.indexOf('-'));
    let fullName = 'component:' + name;
    return owner[FACTORY_FOR](fullName, options);
  },

  layoutFor(name, owner, options) {
    assert(`You cannot use '${name}' as a component name. Component names must contain a hyphen.`, ~name.indexOf('-'));

    let templateFullName = 'template:components/' + name;
    return owner.lookup(templateFullName, options);
  }
});
