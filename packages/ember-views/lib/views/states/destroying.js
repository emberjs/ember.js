import merge from "ember-metal/merge";
import create from 'ember-metal/platform/create';
import _default from "ember-views/views/states/default";
import EmberError from "ember-metal/error";
/**
@module ember
@submodule ember-views
*/

var destroyingError = "You can't call %@ on a view being destroyed";

var destroying = create(_default);

merge(destroying, {
  appendChild() {
    throw new EmberError(`${destroyingError} appendChild`);
  },
  rerender() {
    throw new EmberError(`${destroyingError} rerender`);
  },
  destroyElement() {
    throw new EmberError(`${destroyingError} destroyElement`);
  }
});

export default destroying;
