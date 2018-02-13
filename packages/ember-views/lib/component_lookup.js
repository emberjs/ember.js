import { assert } from 'ember-debug';
import { Object as EmberObject } from 'ember-runtime';
import {
  factoryForWithRawString,
  lookupWithRawString
} from 'container';

export default EmberObject.extend({
  componentFor(name, owner, options) {
    assert(`You cannot use '${name}' as a component name. Component names must contain a hyphen.`, ~name.indexOf('-'));
    if (name.indexOf('::') === -1) {
      let fullName = `component:${name}`;
      return owner.factoryFor(fullName, options);
    } else {
      return factoryForWithRawString(owner, 'component', name);
    }
  },

  layoutFor(name, owner, options) {
    assert(`You cannot use '${name}' as a component name. Component names must contain a hyphen.`, ~name.indexOf('-'));

    if (name.indexOf('::') === -1) {
      let templateFullName = `template:components/${name}`;
      return owner.lookup(templateFullName, options);
    } else {
      return lookupWithRawString(owner, 'template:components/', name);
    }
  }
});
