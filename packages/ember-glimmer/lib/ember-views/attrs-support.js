/**
@module ember
@submodule ember-views
*/
import { Mixin } from 'ember-metal/mixin';
import symbol from 'ember-metal/symbol';

export const COMPONENT_ARGS = symbol('ARGS');

export default Mixin.create({
  init() {
    this._super(...arguments);
  },

  // Potentially do something about bound positionalArgs? *handwave*
  setUnknownProperty(keyName, value) {
    if (this[COMPONENT_ARGS] && this[COMPONENT_ARGS].named.has(keyName)) {
      return this[COMPONENT_ARGS].named.get(keyName).update(value);
    } else {
      return this[keyName] = value;
    }
  },

  unknownProperty(keyName) {
    if (this[COMPONENT_ARGS] && this[COMPONENT_ARGS].named.has(keyName)) {
      return this[COMPONENT_ARGS].named.get(keyName).value();
    } else {
      return this[keyName];
    }
  }
});
