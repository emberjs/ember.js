import _default from "ember-views/views/states/default";
import { create } from "ember-metal/platform";
import merge from "ember-metal/merge";

/**
@module ember
@submodule ember-views
*/
var preRender = create(_default);

merge(preRender, {
  empty: Ember.K,

  setElement: function(view, value) {
    if (value !== null) {
      view._transitionTo('hasElement');
    }
    return value;
  }
});

export default preRender;
