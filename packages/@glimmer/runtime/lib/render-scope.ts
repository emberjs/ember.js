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

// captured handle -> node. Handing out an empty frozen object (rather than
// the node itself) keeps captures opaque: user code can't forge or introspect
// one. The node -- and the provider chain above it -- stays resolvable for as
// long as user code holds the handle.
const CAPTURED_NODES = new WeakMap<object, RenderScopeNode>();

/**
 * Capture the current render-tree position as an opaque handle
 * (createContext's `captureContext`). The handle can be resolved later with
 * `lookupCapturedRenderContext`, even after the render stack has unwound.
 * Returns `undefined` when called outside of rendering -- there is no
 * position to capture.
 */
export function captureRenderScope(): object | undefined {
  let node = CURRENT === undefined ? null : CURRENT.capture();
  if (node === null) {
    return undefined;
  }
  let handle = Object.freeze({});
  CAPTURED_NODES.set(handle, node);
  return handle;
}

/**
 * The nearest provider of `key` above a previously-captured render-tree
 * position:
 *   `undefined` -> `handle` is not a capture produced by `captureRenderScope`,
 *   `null`      -> a valid capture, but no provider for `key` above it,
 *   a function  -> the nearest provider's read fn.
 *
 * Unlike `lookupRenderContext` this works outside of rendering -- that is the
 * point: event handlers and other async callbacks run after the render stack
 * has unwound, so the ambient lookup has nothing to see.
 */
export function lookupCapturedRenderContext(
  handle: object,
  key: object
): ContextRead | null | undefined {
  let node = CAPTURED_NODES.get(handle);
  return node === undefined ? undefined : lookupInChain(node, key);
}
