import type { Owner } from '../types';

export const renderTree = {
  /**
   * Get the debug render tree instance for inspecting component hierarchy.
   *
   * Replaces direct access to renderer._debugRenderTree or service._debugRenderTree.
   * The debug render tree is only available when the `_DEBUG_RENDER_TREE` environment
   * flag is enabled (which is the case in development mode).
   *
   * @param ownerInstance - The owner instance
   * @returns The debug render tree instance or null if not available
   */
  getDebugRenderTree(ownerInstance: Owner): unknown | null {
    try {
      // Try the renderer service first (current approach)
      const renderer = (ownerInstance as any).lookup?.('renderer:-dom');
      if (renderer?.debugRenderTree) {
        return renderer.debugRenderTree;
      }

      // Fallback: try the glimmer environment service (older approach)
      const glimmerEnv = (ownerInstance as any).lookup?.('service:-glimmer-environment');
      if (glimmerEnv?._debugRenderTree) {
        return glimmerEnv._debugRenderTree;
      }

      return null;
    } catch {
      return null;
    }
  },
};
