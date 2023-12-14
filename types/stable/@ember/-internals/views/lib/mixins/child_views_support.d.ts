declare module '@ember/-internals/views/lib/mixins/child_views_support' {
  /**
    @module ember
    */
  import type { View } from '@ember/-internals/glimmer/lib/renderer';
  import Mixin from '@ember/object/mixin';
  interface ChildViewsSupport {
    readonly childViews: View[];
    appendChild(view: View): void;
  }
  const ChildViewsSupport: Mixin;
  export default ChildViewsSupport;
}
