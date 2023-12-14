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
export default function captureRenderTree(app) {
  // SAFETY: Ideally we'd assert here but that causes awkward circular requires since this is also in @ember/debug.
  // This is only for debug stuff so not very risky.
  let renderer = expect(app.lookup('renderer:-dom'), `BUG: owner is missing renderer`);
  return renderer.debugRenderTree.capture();
}