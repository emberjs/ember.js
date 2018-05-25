import { EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { dasherize } from '@ember/string';
import { Object as EmberObject } from 'ember-runtime';

export default EmberObject.extend({
  componentFor(_name, owner, options) {
    assert(
      `You cannot use '${_name}' as a component name. Component names must contain a hyphen${
        EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION ? ' or start with a capital letter' : ''
      }.`,
      _name.indexOf('-') > -1 ||
        (EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION &&
          _name.charAt(0) === _name.charAt(0).toUpperCase())
    );
    let name =
      EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION && _name.charAt(0) === _name.charAt(0).toUpperCase()
        ? dasherize(_name)
        : _name;
    let fullName = `component:${name}`;
    return owner.factoryFor(fullName, options);
  },

  layoutFor(_name, owner, options) {
    assert(
      `You cannot use '${_name}' as a component name. Component names must contain a hyphen.`,
      _name.indexOf('-') > -1 ||
        (EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION &&
          _name.charAt(0) === _name.charAt(0).toUpperCase())
    );

    let name =
      EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION && _name.charAt(0) === _name.charAt(0).toUpperCase()
        ? dasherize(_name)
        : _name;
    let templateFullName = `template:components/${name}`;
    return owner.lookup(templateFullName, options);
  },
});
