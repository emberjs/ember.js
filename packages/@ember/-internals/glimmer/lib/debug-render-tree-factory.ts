import type { DebugRenderTree } from '@glimmer/interfaces';

/**
 * The `DebugRenderTree` implementation is relatively heavy and is only needed
 * when debug tooling (e.g. Ember Inspector) is in use. To allow the
 * implementation to be tree-shaken out of production builds that never use
 * it, the environment does not reference the implementation directly.
 * Instead, an implementation is registered here:
 *
 * - in debug builds, eagerly (see `./environment`), preserving the existing
 *   behavior of `EmberENV._DEBUG_RENDER_TREE` defaulting to on in
 *   development; and
 * - in production builds, as a side effect of importing
 *   `@ember/debug/lib/capture-render-tree` (the entry point Ember Inspector
 *   relies on), preserving the documented `EmberENV._DEBUG_RENDER_TREE`
 *   production opt-in for apps that include that module.
 *
 * Production apps whose module graph never reaches `captureRenderTree` pay
 * neither the bytes nor the runtime cost.
 */
let debugRenderTreeFactory: (() => DebugRenderTree<object>) | undefined;

export function setDebugRenderTreeFactory(factory: () => DebugRenderTree<object>): void {
  debugRenderTreeFactory = factory;
}

export function createDebugRenderTree(): DebugRenderTree<object> | undefined {
  return debugRenderTreeFactory?.();
}
