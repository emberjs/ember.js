import { DEBUG } from '@glimmer/env';
import type {
  Bounds,
  CapturedArguments,
  CapturedRenderNode,
  CapturedRenderNodeArgReactivity,
  CapturedRenderNodeReactivity,
  ComponentDefinition,
  DebugRenderTree,
  Nullable,
  Reference,
  RenderNode,
  Revision,
} from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { lastRevisionForRef } from '@glimmer/reference/lib/reference';
import { assign } from '@glimmer/util/lib/object-utils';
import { StackImpl as Stack } from '@glimmer/util/lib/collections';
import { CURRENT_TAG, valueForTag } from '@glimmer/validator/lib/validators';

import { reifyArgsDebug } from './vm/arguments';

interface RenderNodeUpdates {
  count: number;
  revision: Revision;
  previousRevision: Nullable<Revision>;
}

interface InternalRenderNode<T extends object> extends RenderNode {
  bounds: Nullable<Bounds>;
  refs: Set<Ref<T>>;
  updates: RenderNodeUpdates;
  parent?: InternalRenderNode<T>;
}

let GUID = 0;

export class Ref<T extends object> {
  readonly id: number = GUID++;
  private value: Nullable<T>;

  constructor(value: T) {
    this.value = value;
  }

  get(): Nullable<T> {
    return this.value;
  }

  release(): void {
    if (DEBUG && this.value === null) {
      throw new Error('BUG: double release?');
    }

    this.value = null;
  }

  toString(): string {
    let label = `Ref ${this.id}`;

    if (this.value === null) {
      return `${label} (released)`;
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        return `${label}: ${this.value}`;
      } catch {
        return label;
      }
    }
  }
}

export default class DebugRenderTreeImpl<
  TBucket extends object,
> implements DebugRenderTree<TBucket> {
  private stack = new Stack<TBucket>();

  private refs = new WeakMap<TBucket, Ref<TBucket>>();
  private roots = new Set<Ref<TBucket>>();
  private nodes = new WeakMap<TBucket, InternalRenderNode<TBucket>>();

  begin(): void {
    this.reset();
  }

  create(state: TBucket, node: RenderNode): void {
    let internalNode: InternalRenderNode<TBucket> = assign({}, node, {
      bounds: null,
      refs: new Set<Ref<TBucket>>(),
      updates: {
        count: 0,
        revision: valueForTag(CURRENT_TAG),
        previousRevision: null,
      },
    });
    this.nodes.set(state, internalNode);
    this.appendChild(internalNode, state);
    this.enter(state);
  }

  update(state: TBucket): void {
    let updates = this.nodeFor(state).updates;
    updates.previousRevision = updates.revision;
    updates.revision = valueForTag(CURRENT_TAG);
    updates.count++;

    this.enter(state);
  }

  didRender(state: TBucket, bounds: Nullable<Bounds>): void {
    if (DEBUG && this.stack.current !== state) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      throw new Error(`BUG: expecting ${this.stack.current}, got ${state}`);
    }

    this.nodeFor(state).bounds = bounds;
    this.exit();
  }

  willDestroy(state: TBucket): void {
    expect(this.refs.get(state), 'BUG: missing ref').release();
  }

  commit(): void {
    this.reset();
  }

  capture(): CapturedRenderNode[] {
    return this.captureRefs(this.roots);
  }

  private reset(): void {
    if (this.stack.size !== 0) {
      // We probably encountered an error during the rendering loop. This will
      // likely trigger undefined behavior and memory leaks as the error left
      // things in an inconsistent state. It is recommended that the user
      // refresh the page.

      // TODO: We could warn here? But this happens all the time in our tests?

      // Clean up the root reference to prevent errors from happening if we
      // attempt to capture the render tree (Ember Inspector may do this)
      let root = expect(this.stack.toArray()[0], 'expected root state when resetting render tree');
      let ref = this.refs.get(root);

      if (ref !== undefined) {
        this.roots.delete(ref);
      }

      while (!this.stack.isEmpty()) {
        this.stack.pop();
      }
    }
  }

  private enter(state: TBucket): void {
    this.stack.push(state);
  }

  private exit(): void {
    if (DEBUG && this.stack.size === 0) {
      throw new Error('BUG: unbalanced pop');
    }

    this.stack.pop();
  }

  private nodeFor(state: TBucket): InternalRenderNode<TBucket> {
    return expect(this.nodes.get(state), 'BUG: missing node');
  }

  private appendChild(node: InternalRenderNode<TBucket>, state: TBucket): void {
    if (DEBUG && this.refs.has(state)) {
      throw new Error('BUG: child already appended');
    }

    let parent = this.stack.current;
    let ref = new Ref(state);

    this.refs.set(state, ref);

    if (parent) {
      let parentNode = this.nodeFor(parent);
      parentNode.refs.add(ref);
      node.parent = parentNode;
    } else {
      this.roots.add(ref);
    }
  }

  private captureRefs(refs: Set<Ref<TBucket>>): CapturedRenderNode[] {
    let captured: CapturedRenderNode[] = [];

    refs.forEach((ref) => {
      let state = ref.get();

      if (state) {
        captured.push(this.captureNode(`render-node:${ref.id}`, state));
      } else {
        refs.delete(ref);
      }
    });

    return captured;
  }

  private captureNode(id: string, state: TBucket): CapturedRenderNode {
    let node = this.nodeFor(state);
    let { type, name, args, instance, refs } = node;
    // Reify before capturing reactivity so the argument references carry
    // their current revisions.
    let reifiedArgs = reifyArgsDebug(args);
    let reactivity = captureReactivity(node.updates, args);
    let bounds = this.captureBounds(node);
    let children = this.captureRefs(refs);
    return { id, type, name, args: reifiedArgs, instance, bounds, reactivity, children };
  }

  private captureBounds(node: InternalRenderNode<TBucket>): CapturedRenderNode['bounds'] {
    // Helper nodes are not rendered into the DOM and legitimately have no
    // bounds; everything else must have rendered by capture time.
    if (node.type === 'helper' && node.bounds === null) {
      return null;
    }

    let bounds = expect(node.bounds, 'BUG: missing bounds');
    let parentElement = bounds.parentElement();
    let firstNode = bounds.firstNode();
    let lastNode = bounds.lastNode();
    return { parentElement, firstNode, lastNode };
  }
}

function captureArgReactivity(
  ref: Reference,
  previousRevision: Nullable<Revision>
): CapturedRenderNodeArgReactivity {
  let revision = lastRevisionForRef(ref);

  return {
    debugLabel: typeof ref.debugLabel === 'string' ? ref.debugLabel : undefined,
    revision,
    // Arguments whose value was invalidated after the node's previous
    // render are what caused its most recent re-render.
    changed: previousRevision !== null && revision > previousRevision,
  };
}

function captureReactivity(
  updates: RenderNodeUpdates,
  args: CapturedArguments
): CapturedRenderNodeReactivity {
  let { count, revision, previousRevision } = updates;

  let positional = args.positional.map((ref) => captureArgReactivity(ref, previousRevision));

  let named: Record<string, CapturedRenderNodeArgReactivity> = {};
  for (let [key, ref] of Object.entries(args.named)) {
    named[key] = captureArgReactivity(ref, previousRevision);
  }

  return {
    updateCount: count,
    revision,
    previousRevision,
    args: { positional, named },
  };
}

export function getDebugName(
  definition: ComponentDefinition,
  manager = definition.manager
): string {
  return definition.resolvedName ?? definition.debugName ?? manager.getDebugName(definition.state);
}
