import type { SimpleDocument } from '@glimmer/interfaces';
import { ENV } from '@ember/-internals/environment';
import { setRenderer } from '@ember/-internals/glimmer';
import { BaseRenderer, type IBuilder } from '@ember/-internals/glimmer/lib/base-renderer';

import { ownRenderer } from './owner';
import type { TestJitRuntimeResolver } from './jit/resolver';

import JitCompileTimeLookup from './jit/compilation-context';

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
  resolver: TestJitRuntimeResolver,
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
      new JitCompileTimeLookup(resolver),
      builder
    );
  } finally {
    ENV._DEBUG_RENDER_TREE = previous;
  }

  setRenderer(owner, renderer);
  ownRenderer(owner, renderer);

  return renderer;
}
