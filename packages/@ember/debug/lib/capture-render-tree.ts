import type { Renderer } from '@ember/-internals/glimmer/lib/renderer';
import type { BaseRenderer } from '@ember/-internals/glimmer/lib/base-renderer';
import type Owner from '@ember/owner';
import type { CapturedRenderNode } from '@glimmer/interfaces';

/**
 * `renderComponent` renders with its own renderer per owner,
 * separate from the owner's `renderer:-dom`.
 *
 * The renderer registers itself here,
 * because importing it would be a circular import.
 */
const COMPONENT_RENDERERS = new WeakMap<object, BaseRenderer>();

export function registerComponentRenderer(owner: object, renderer: BaseRenderer): void {
  COMPONENT_RENDERERS.set(owner, renderer);
}

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
  let domRenderer = app.lookup('renderer:-dom') as Renderer | undefined;
  let componentRenderer = COMPONENT_RENDERERS.get(app);

  if (!domRenderer && !componentRenderer) {
    throw new Error(`BUG: owner is missing renderer`);
  }
  // SAFETY: Ideally we'd assert here but that causes awkward circular requires since this is also in @ember/debug.
  // This is only for debug stuff so not very risky.

  let nodes: CapturedRenderNode[] = domRenderer ? domRenderer.debugRenderTree.capture() : [];

  if (componentRenderer) {
    for (let node of componentRenderer.debugRenderTree.capture()) {
      nodes.push(node);
    }
  }

  return nodes;
}
