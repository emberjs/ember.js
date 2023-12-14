import { nativeDescDecorator } from '@ember/-internals/metal';
import Mixin from '@ember/object/mixin';
import { getChildViews, addChildView } from '../system/utils';
const ChildViewsSupport = Mixin.create({
  /**
    Array of child views. You should never edit this array directly.
       @property childViews
    @type Array
    @default []
    @private
  */
  childViews: nativeDescDecorator({
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
export default ChildViewsSupport;