declare module '@ember/debug/lib/capture-render-tree' {
  import type Owner from '@ember/owner';
  import type { CapturedRenderNode } from '@glimmer/interfaces';
  /**
      @module @ember/debug
    */
  /**
      Ember Inspector calls this function to capture the current render tree.

      In production mode, this requires turning on `ENV._DEBUG_RENDER_TREE`
      before loading Ember.

      @private
      @static
      @method captureRenderTree
      @for @ember/debug
      @param app {ApplicationInstance} An `ApplicationInstance`.
      @since 3.14.0
    */
  export default function captureRenderTree(app: Owner): CapturedRenderNode[];
}
