/**
@module ember
@submodule ember-views
*/

import { get } from "ember-metal/property_get";
import { Mixin } from 'ember-metal/mixin';
import merge from "ember-metal/merge";
import {
  cloneStates,
  states as viewStates
} from "ember-views/views/states";

var states = cloneStates(viewStates);

merge(states._default, {
  rerenderIfNeeded: function() { return this; }
});

merge(states.inDOM, {
  rerenderIfNeeded: function(view) {
    if (view.normalizedValue() !== view._lastNormalizedValue) {
      view.rerender();
    }
  }
});

export default Mixin.create({
  _states: states,

  normalizedValue: function() {
    var value = this.lazyValue.value();
    var valueNormalizer = get(this, 'valueNormalizerFunc');
    return valueNormalizer ? valueNormalizer(value) : value;
  },

  rerenderIfNeeded: function() {
    this.currentState.rerenderIfNeeded(this);
  }
});
