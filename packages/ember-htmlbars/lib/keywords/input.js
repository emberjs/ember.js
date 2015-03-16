import Ember from "ember-metal/core";

export default {
  setupState(lastState, env, scope, params, hash) {
    var type = env.hooks.getValue(hash.type) || 'text';

    Ember.assert("{{input type='checkbox'}} does not support setting `value=someBooleanValue`;" +
                 " you must use `checked=someBooleanValue` instead.", !(type === 'checkbox' && hash.hasOwnProperty('value')));

    return { componentName: classification[type] };
  },

  render(morph, env, scope, params, hash, template, inverse, visitor) {
    // Force the component hook to treat this as a first-time render,
    // because normal components (`<foo-bar>`) cannot change at runtime,
    // but the `{{component}}` helper can.
    morph.state.componentNode = null;

    env.hooks.component(morph, env, scope, morph.state.componentName, hash, template, visitor);
  }
};

var classification = {
  'text': '-text-field',
  'password': '-text-field',
  'checkbox': '-checkbox'
};
