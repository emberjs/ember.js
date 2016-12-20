import { assign } from 'ember-utils';
import { Error as EmberError } from 'ember-metal';
import _default from './default';
import jQuery from '../../system/jquery';
/**
@module ember
@submodule ember-views
*/

const destroying = Object.create(_default);

assign(destroying, {
  $(view, sel) {
    let elem = view.element;
    if (elem) {
      return sel ? jQuery(sel, elem) : jQuery(elem);
    }
  },
  appendChild() {
    throw new EmberError('You can\'t call appendChild on a view being destroyed');
  },
  rerender() {
    throw new EmberError('You can\'t call rerender on a view being destroyed');
  }
});

export default destroying;
