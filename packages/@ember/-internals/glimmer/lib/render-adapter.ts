import { assert } from '@ember/debug';
import type { RenderAdapter } from '@glimmer/interfaces';
import { DOMRenderAdapter } from '@glimmer/runtime/lib/dom/render-adapter';
import type { SimpleDocument } from '@simple-dom/interface';

/**
 * The render adapter of each owner.
 *
 * This is the only way for an owner to give the renderer its adapter.
 * The renderer does not read a document from the container.
 */
const ADAPTER_FOR_OWNER = new WeakMap<object, RenderAdapter>();

export function setRenderAdapter(owner: object, adapter: RenderAdapter): void {
  ADAPTER_FOR_OWNER.set(owner, adapter);
}

export function adapterForDocument(document: SimpleDocument): RenderAdapter {
  return new DOMRenderAdapter(document);
}

/**
 * Returns the adapter of `owner`.
 * An owner with no adapter gets one for the global `document`.
 */
export function getRenderAdapter(owner: object): RenderAdapter {
  let adapter = ADAPTER_FOR_OWNER.get(owner);

  if (adapter === undefined) {
    assert(
      'There is no global `document`. Give the owner a render adapter with `setRenderAdapter`, or boot the application with a `document`.',
      typeof document !== 'undefined'
    );

    adapter = adapterForDocument(document as unknown as SimpleDocument);
    ADAPTER_FOR_OWNER.set(owner, adapter);
  }

  return adapter;
}
