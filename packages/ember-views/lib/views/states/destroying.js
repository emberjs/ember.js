import merge from "ember-metal/merge";
import create from 'ember-metal/platform/create';
import {fmt} from "ember-runtime/system/string";
import _default from "ember-views/views/states/default";
import EmberError from "ember-metal/error";
/**
@module ember
@submodule ember-views
*/

var destroyingError = "You can't call %@ on a view being destroyed";

var destroying = create(_default);

merge(destroying, {
  appendChild: function() {
    throw new EmberError(fmt(destroyingError, ['appendChild']));
  },
  rerender: function() {
    throw new EmberError(fmt(destroyingError, ['rerender']));
  },
  destroyElement: function() {
    throw new EmberError(fmt(destroyingError, ['destroyElement']));
  }
});

export default destroying;

