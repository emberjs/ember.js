import { assign } from 'ember-utils';
import { Error as EmberError } from 'ember-metal';
import _default from './default';
/**
@module ember
@submodule ember-views
*/

const destroying = Object.create(_default);

assign(destroying, {
  appendChild() {
    throw new EmberError('You can\'t call appendChild on a view being destroyed');
  },
  rerender() {
    throw new EmberError('You can\'t call rerender on a view being destroyed');
  }
});

export default destroying;
