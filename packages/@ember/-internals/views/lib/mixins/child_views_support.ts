/**
@module ember
*/
import type { View } from '@ember/-internals/glimmer/lib/renderer';
import { nativeDescDecorator } from '@ember/-internals/metal';
import Mixin from '@ember/object/mixin';
import { getChildViews, addChildView } from '../system/utils';

interface ChildViewsSupport {
  readonly childViews: View[];
  appendChild(view: View): void;
}
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
    get(this: View) {
      return getChildViews(this);
    },
  }),

  appendChild(view: View) {
    addChildView(this, view);
  },
});

export default ChildViewsSupport;
