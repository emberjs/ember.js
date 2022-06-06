import EmberError from '@ember/error';
import { type ViewState } from '../states';
import _default from './default';

const destroying: ViewState = {
  ..._default,

  appendChild() {
    throw new EmberError("You can't call appendChild on a view being destroyed");
  },

  rerender() {
    throw new EmberError("You can't call rerender on a view being destroyed");
  },
};

export default Object.freeze(destroying);
