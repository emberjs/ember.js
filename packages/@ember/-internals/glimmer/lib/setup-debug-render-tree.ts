import DebugRenderTreeImpl from '@glimmer/runtime/lib/debug-render-tree';

import { setDebugRenderTreeFactory } from './debug-render-tree-factory';

/**
 * Registers the real `DebugRenderTree` implementation so that renderers
 * created afterwards will record the render tree (when
 * `EmberENV._DEBUG_RENDER_TREE` is enabled).
 *
 * Importing this module is what causes the `DebugRenderTree` implementation
 * to be included in a build; see `./debug-render-tree-factory`.
 */
export function enableDebugRenderTree(): void {
  setDebugRenderTreeFactory(() => new DebugRenderTreeImpl());
}
