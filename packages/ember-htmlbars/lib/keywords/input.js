import Ember from "ember-metal/core";
import { assign } from "ember-metal/merge";

export default {
  setupState(lastState, env, scope, params, hash) {
    var type = env.hooks.getValue(hash.type);
    var componentName = componentNameMap[type] || defaultComponentName;

    Ember.assert("{{input type='checkbox'}} does not support setting `value=someBooleanValue`;" +
                 " you must use `checked=someBooleanValue` instead.", !(type === 'checkbox' && hash.hasOwnProperty('value')));

    return assign({}, lastState, { componentName });
  },

  render(morph, env, scope, params, hash, template, inverse, visitor) {
    env.hooks.component(morph, env, scope, morph.state.componentName, params, hash, template, visitor);
  },

  rerender(...args) {
    this.render(...args);
  }
};

var defaultComponentName = "-text-field";

var componentNameMap = {
  'checkbox': '-checkbox'
};
