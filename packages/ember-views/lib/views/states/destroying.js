import assign from 'ember-metal/assign';
import _default from 'ember-views/views/states/default';
import EmberError from 'ember-metal/error';
/**
@module ember
@submodule ember-views
*/

var destroying = Object.create(_default);

assign(destroying, {
  appendChild() {
    throw new EmberError('You can\'t call appendChild on a view being destroyed');
  },
  rerender() {
    throw new EmberError('You can\'t call rerender on a view being destroyed');
  },
  destroyElement() {
    throw new EmberError('You can\'t call destroyElement on a view being destroyed');
  }
});

export default destroying;

