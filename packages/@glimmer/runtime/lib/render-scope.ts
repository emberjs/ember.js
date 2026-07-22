import type { Nullable } from '@glimmer/interfaces';
import { StackImpl as Stack } from '@glimmer/util/lib/collections';

// createContext (RFC #1200) is the only consumer. A `read` returns the
// currently-provided value for a context key, evaluated lazily so that
// auto-tracking inside it makes consumers reactive to the provided `@value`.
type ContextRead = () => unknown;

interface RenderScopeNode {
  parent: Nullable<RenderScopeNode>;
  // key -> read, lazily allocated (most render nodes never provide a context).
  contexts: Nullable<Map<object, ContextRead>>;
}

/**
 * Tracks the render-tree node hierarchy so a consumer can find the nearest
 * provider above it. Mirrors `DebugRenderTree`'s stack management, but is
 * always-on because it backs a real feature.
 */
export class RenderScopeTracker {
  private stack = new Stack<RenderScopeNode>();
  // bucket (component instance) -> node, so updating frames can re-push it.
  private nodes = new WeakMap<object, RenderScopeNode>();

  // Drop any nodes left on the stack by a render that errored mid-flight.
  begin(): void {
    while (!this.stack.isEmpty()) {
      this.stack.pop();
    }
  }

  // Push a fresh node when a component is created (before its constructor runs).
  create(bucket: object): void {
    let node: RenderScopeNode = { parent: this.stack.current ?? null, contexts: null };
    this.nodes.set(bucket, node);
    this.stack.push(node);
  }

  // Re-push an existing node when its component re-renders.
  enter(bucket: object): void {
    let node = this.nodes.get(bucket);
    if (node !== undefined) {
      this.stack.push(node);
    }
  }

  exit(): void {
    this.stack.pop();
  }

  // Provide `key`'s value at the current node (called from `<Provide>`, which is
  // always the rendering node, so `current` is guaranteed to be set).
  provide(key: object, read: ContextRead): void {
    let node = this.stack.current;
    if (node) {
      (node.contexts ??= new Map()).set(key, read);
    }
  }

  // The nearest provider of `key`:
  //   `undefined` -> not inside a render frame (e.g. a modifier installing
  //                  during commit, after the render stack has unwound),
  //   `null`      -> inside a frame, but no provider for `key`,
  //   a function  -> the nearest provider's read fn.
  lookup(key: object): ContextRead | null | undefined {
    let current = this.stack.current;
    if (current === null) {
      return undefined;
    }
    return lookupInChain(current, key);
  }

  // The node currently being rendered, for `captureRenderScope`. `null`
  // outside a render frame.
  capture(): Nullable<RenderScopeNode> {
    return this.stack.current;
  }
}

// Walk `start` and its ancestors for the nearest provider of `key`.
function lookupInChain(start: RenderScopeNode, key: object): ContextRead | null {
  for (let node: Nullable<RenderScopeNode> = start; node !== null; node = node.parent) {
    let read = node.contexts?.get(key);
    if (read !== undefined) {
      return read;
    }
  }
  return null;
}

// The renderer points this at the active tracker for the duration of a render,
// so the helpers below work from anywhere in a tick (e.g. a context `value`
// read that has no handle to the VM). Cleared between renders.
let CURRENT: RenderScopeTracker | undefined;

export function setCurrentRenderScopeTracker(tracker: RenderScopeTracker | undefined): void {
  CURRENT = tracker;
}

/** Provide `key`'s value at the current render node (createContext's `<Provide>`). */
export function provideRenderContext(key: object, read: ContextRead): void {
  if (CURRENT === undefined) {
    throw new Error('A context can only be provided while rendering.');
  }
  CURRENT.provide(key, read);
}

/**
 * The nearest provider of `key`:
 *   `undefined` -> called outside of rendering,
 *   `null`      -> rendering, but no provider for `key`,
 *   a function  -> the nearest provider's read fn.
 */
export function lookupRenderContext(key: object): ContextRead | null | undefined {
  return CURRENT === undefined ? undefined : CURRENT.lookup(key);
}

// user-facing component instance -> its render-scope node. Populated by the
// VM when a component's `self` becomes known (VM_GET_COMPONENT_SELF_OP), so
// `context.consume(this)` can resolve contexts after the render stack has
// unwound. The association -- and the provider chain above the node -- lives
// exactly as long as the instance itself.
const ASSOCIATED_NODES = new WeakMap<object, RenderScopeNode>();

/**
 * Associate a user-facing component instance with the currently-rendering
 * node, making the instance usable with `lookupRenderContextFor` later. A
 * no-op outside of a render frame (there is no node to associate with).
 */
export function associateRenderScope(instance: object): void {
  let node = CURRENT === undefined ? null : CURRENT.capture();
  if (node !== null) {
    ASSOCIATED_NODES.set(instance, node);
  }
}

/**
 * The nearest provider of `key` above `instance`'s position in the render
 * tree:
 *   `undefined` -> `instance` has no associated render-scope node (it is not
 *                  a component instance, or it has not rendered),
 *   `null`      -> a known instance, but no provider for `key` above it,
 *   a function  -> the nearest provider's read fn.
 *
 * Unlike `lookupRenderContext` this works outside of rendering -- that is the
 * point: event handlers and other async callbacks run after the render stack
 * has unwound, so the ambient lookup has nothing to see.
 */
export function lookupRenderContextFor(
  instance: object,
  key: object
): ContextRead | null | undefined {
  let node = ASSOCIATED_NODES.get(instance);
  return node === undefined ? undefined : lookupInChain(node, key);
}
