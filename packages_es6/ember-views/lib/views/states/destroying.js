import merge from "ember-metal/merge";
import {create} from "ember-metal/platform";
import {fmt} from "ember-runtime/system/string";
import _default from "ember-views/views/states/default";
/**
@module ember
@submodule ember-views
*/

var destroyingError = "You can't call %@ on a view being destroyed";

var destroying = create(_default);

merge(destroying, {
  appendChild: function() {
    throw fmt(destroyingError, ['appendChild']);
  },
  rerender: function() {
    throw fmt(destroyingError, ['rerender']);
  },
  destroyElement: function() {
    throw fmt(destroyingError, ['destroyElement']);
  },
  empty: function() {
    throw fmt(destroyingError, ['empty']);
  },

  setElement: function() {
    throw fmt(destroyingError, ["set('element', ...)"]);
  },

  renderToBufferIfNeeded: function() {
    return false;
  },

  // Since element insertion is scheduled, don't do anything if
  // the view has been destroyed between scheduling and execution
  insertElement: Ember.K
});

export default destroying;

