/**
@module ember
@submodule ember-views
*/
import {
  Mixin,
  descriptor
} from 'ember-metal';
import { getOwner, setOwner } from 'container';
import { initChildViews, getChildViews, addChildView } from '../system/utils';

export default Mixin.create({
  init() {
    this._super(...arguments);
    initChildViews(this);
  },

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
    this.linkChild(view);
    addChildView(this, view);
  },

  linkChild(instance) {
    if (!getOwner(instance)) {
      setOwner(instance, getOwner(this));
    }
  }
});
