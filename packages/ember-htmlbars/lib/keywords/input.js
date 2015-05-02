import Ember from "ember-metal/core";

export default {
  setupState(lastState, env, scope, params, hash) {
    var type = env.hooks.getValue(hash.type);
    var componentName = componentNameMap[type] || defaultComponentName;

    Ember.assert("{{input type='checkbox'}} does not support setting `value=someBooleanValue`;" +
                 " you must use `checked=someBooleanValue` instead.", !(type === 'checkbox' && hash.hasOwnProperty('value')));

    return { componentName };
  },

  render(morph, env, scope, params, hash, template, inverse, visitor) {
    // Force the component hook to treat this as a first-time render,
    // because normal components (`<foo-bar>`) cannot change at runtime,
    // but the `{{component}}` helper can.
    morph.state.manager = null;

    env.hooks.component(morph, env, scope, morph.state.componentName, hash, template, visitor);
  }
};

var defaultComponentName = "-text-field";

var componentNameMap = {
  'checkbox': '-checkbox'
};
