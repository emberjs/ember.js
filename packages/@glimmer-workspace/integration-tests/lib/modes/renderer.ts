import type { SimpleDocument } from '@glimmer/interfaces';
import { ENV } from '@ember/-internals/environment';
import { setRenderer } from '@ember/-internals/glimmer';
import { BaseRenderer, type IBuilder } from '@ember/-internals/glimmer/lib/base-renderer';
import type ResolverImpl from '@ember/-internals/glimmer/lib/resolver';

import type { DebugBounds, RenderHandle } from '../render-delegate';

import { associateDestroyableChild } from '@glimmer/destroyable';

const HANDLE_BOUNDS = new WeakMap<RenderHandle, () => DebugBounds>();

/** A handle for a render, which remembers how to read the bounds of its output. */
export function handleWithBounds(handle: RenderHandle, bounds: () => DebugBounds): RenderHandle {
  HANDLE_BOUNDS.set(handle, bounds);
  return handle;
}

/** The first and last node of the render a handle stands for (`RenderDelegate.debugBounds`). */
export function boundsOf(handle: RenderHandle): DebugBounds {
  let bounds = HANDLE_BOUNDS.get(handle);
  if (bounds === undefined) throw new Error('this render handle has no debug bounds');
  return bounds();
}

/**
 * An Ember renderer for one owner and document, registered as the renderer that the
 * public `renderComponent` uses for that owner.
 *
 * Ember's environment delegate reads `ENV._DEBUG_RENDER_TREE` when it is constructed,
 * so the option is set around the constructor.
 */
export function createRenderer(
  owner: object,
  doc: SimpleDocument,
  resolver: ResolverImpl,
  builder: IBuilder,
  debugRenderTree: boolean
): BaseRenderer {
  let previous = ENV._DEBUG_RENDER_TREE;
  ENV._DEBUG_RENDER_TREE = debugRenderTree;

  let renderer: BaseRenderer;

  try {
    renderer = new BaseRenderer(
      owner,
      { isInteractive: true, hasDOM: true },
      doc,
      resolver,
      builder
    );
  } finally {
    ENV._DEBUG_RENDER_TREE = previous;
  }

  setRenderer(owner, renderer);
  associateDestroyableChild(owner, renderer);

  return renderer;
}
