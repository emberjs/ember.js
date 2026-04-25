/**
 * Ember Inspector adapter for GXT mode (MVP).
 *
 * Under the classic Glimmer VM backend, Ember Inspector builds its
 * component tree by walking a DebugRenderTree produced from opcode-level
 * render-node bookkeeping. Under GXT there are no opcodes, so this
 * adapter produces an equivalent tree shape by walking the live
 * `-view-registry:main` registry that the GXT compat manager
 * (`manager.ts`) populates as components mount.
 *
 * Scope: this is plumbing. It returns a well-formed component tree so
 * the inspector's "Components" / "Render Tree" tab renders without
 * errors. Advanced features (render-timing, re-render diagnostics,
 * bound highlighting) are stubbed to empty no-op responses so the
 * extension does not throw.
 *
 * See INSPECTOR.md next to this file for the JSON shape, what is
 * supported, and how to extend it.
 */

import {
  getRootViews,
  getChildViews,
  getViewBoundingClientRect,
} from '@ember/-internals/views/lib/system/utils';

// We intentionally import the View type loosely: the classic View type
// comes from `@ember/-internals/glimmer`, which is not available in
// GXT-only builds. Treat each view as an opaque object with the fields
// the registry exposes.
type ViewLike = {
  elementId?: string;
  tagName?: string;
  parentView?: unknown;
  constructor?: { name?: string };
  renderer?: unknown;
  // The GXT compat manager attaches these when it registers a view:
  _gxtComponentName?: string;
  _gxtArgs?: { positional?: unknown[]; named?: Record<string, unknown> };
  _gxtInstance?: unknown;
  _gxtTemplate?: string;
  _debugName?: string;
};

/**
 * The JSON shape consumed by Ember Inspector's component tree tab.
 *
 * This mirrors `CapturedRenderNode` from `@glimmer/interfaces` /
 * `packages/@ember/-internals/gxt-backend/debug-render-tree.ts` so the
 * extension does not need GXT-specific code to render it.
 */
export interface InspectorNode {
  id: string;
  type: 'component' | 'outlet' | 'engine' | 'route-template' | 'modifier' | 'keyword';
  name: string;
  args: {
    positional: unknown[];
    named: Record<string, unknown>;
  };
  instance: unknown;
  template: string | null;
  bounds: {
    parentElement: Element | null;
    firstNode: Node | null;
    lastNode: Node | null;
  } | null;
  children: InspectorNode[];
}

/**
 * Produce the component tree for the given application owner.
 * Walks `-view-registry:main` via the public view utils.
 */
export function getGxtComponentTree(owner: unknown): InspectorNode[] {
  if (!owner) return [];
  try {
    const roots = getRootViews(owner as any) as unknown as ViewLike[];
    return roots.map((view) => buildNode(view)).filter((n): n is InspectorNode => n !== null);
  } catch (err) {
    // Surface the error so a developer opening the inspector under GXT
    // mode with a broken registry sees what's wrong, rather than a
    // silent empty tree.
    console.error('[gxt-inspector] Failed to build component tree:', err);
    return [];
  }
}

function buildNode(view: ViewLike): InspectorNode | null {
  if (!view) return null;

  const id =
    view.elementId ??
    (view as any).__gxtInspectorId ??
    `gxt-view-${Math.random().toString(36).slice(2, 10)}`;

  const name =
    view._gxtComponentName ?? view._debugName ?? view.constructor?.name ?? 'UnknownComponent';

  const args = {
    positional: view._gxtArgs?.positional ?? [],
    named: view._gxtArgs?.named ?? {},
  };

  let children: InspectorNode[] = [];
  try {
    children = (getChildViews(view as any) as unknown as ViewLike[])
      .map((c) => buildNode(c))
      .filter((c): c is InspectorNode => c !== null);
  } catch {
    // If child traversal fails for a single node, return the node
    // anyway with no children so the rest of the tree still renders.
    children = [];
  }

  return {
    id,
    type: 'component',
    name,
    args,
    instance: view._gxtInstance ?? view,
    template: view._gxtTemplate ?? null,
    bounds: null, // computed on demand via getInspectorBounds()
    children,
  };
}

/**
 * Stubs for DevTools queries the MVP does not implement. These return
 * empty / safe default values rather than throwing so the extension
 * does not error out on unimplemented features.
 */
export const gxtInspectorStubs = {
  /** No per-node render timing under GXT yet. */
  getRenderPerformance(): { components: unknown[] } {
    return { components: [] };
  },

  /**
   * Best-effort bounds lookup. Returns a DOMRect if we can find the
   * view by id in the registry, otherwise null.
   */
  getViewBounds(owner: unknown, id: string): DOMRect | null {
    if (!owner) return null;
    try {
      const roots = getRootViews(owner as any) as unknown as ViewLike[];
      const found = findViewById(roots, id);
      if (!found) return null;
      return getViewBoundingClientRect(found as any);
    } catch {
      return null;
    }
  },

  /**
   * Highlight-component is a no-op under MVP. The classic path draws
   * an overlay; we intentionally leave that to a follow-up so this
   * adapter has no DOM side-effects.
   */
  highlightComponent(_owner: unknown, _id: string): void {
    /* no-op under MVP */
  },

  /** No re-render tracking yet. */
  getRerenderReasons(_id: string): unknown[] {
    return [];
  },
};

function findViewById(roots: ViewLike[], id: string): ViewLike | null {
  for (const v of roots) {
    if (!v) continue;
    if (v.elementId === id) return v;
    try {
      const kids = getChildViews(v as any) as unknown as ViewLike[];
      const hit = findViewById(kids, id);
      if (hit) return hit;
    } catch {
      // skip this branch
    }
  }
  return null;
}
