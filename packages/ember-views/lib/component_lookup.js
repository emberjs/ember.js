import { EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { Object as EmberObject } from 'ember-runtime';

export default EmberObject.extend({
  componentFor(name, owner, options) {
    assert(
      `You cannot use '${name}' as a component name. Component names must contain a hyphen${
        EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION ? ' or start with a capital letter' : ''
      }.`,
      name.indexOf('-') > -1 || EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION
    );

    let fullName = `component:${name}`;
    return owner.factoryFor(fullName, options);
  },

  layoutFor(name, owner, options) {
    assert(
      `You cannot use '${name}' as a component name. Component names must contain a hyphen.`,
      name.indexOf('-') > -1 || EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION
    );

    let templateFullName = `template:components/${name}`;
    return owner.lookup(templateFullName, options);
  },
});
