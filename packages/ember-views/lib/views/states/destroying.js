import { assign } from 'ember-utils';
import { Error as EmberError } from 'ember-debug';
import _default from './default';

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
