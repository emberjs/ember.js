/**
@module ember
*/
import {
  Mixin,
  descriptor
} from 'ember-metal';
import {
  getChildViews,
  addChildView
} from '../system/utils';

export default Mixin.create({
  /**
    Array of child views. You should never edit this array directly.

    @property childViews
    @type Array
    @default []
    @private
  */
  childViews: descriptor({
    configurable: false,
    enumerable: false,
    get() {
      return getChildViews(this);
    }
  }),

  appendChild(view) {
    addChildView(this, view);
  }
});
