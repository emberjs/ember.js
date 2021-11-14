import { Renderer } from '@ember/-internals/glimmer';
import { Owner } from '@ember/-internals/owner';
import { CapturedRenderNode } from '@glimmer/interfaces';
import { expect } from '@glimmer/util';

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
export default function captureRenderTree(app: Owner): CapturedRenderNode[] {
  let renderer = expect(app.lookup<Renderer>('renderer:-dom'), `BUG: owner is missing renderer`);

  return renderer.debugRenderTree.capture();
}
