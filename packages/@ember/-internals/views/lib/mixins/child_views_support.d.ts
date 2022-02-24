import { View } from '@ember/-internals/glimmer/lib/renderer';
import Mixin from '@ember/object/mixin';

interface ChildViewsSupport {
  readonly childViews: View[];
  appendChild(view: View): void;
}
declare const ChildViewsSupport: Mixin;

export default ChildViewsSupport;
