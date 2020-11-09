import { DEBUG } from '@glimmer/env';
import {
  Bounds,
  CapturedRenderNode,
  DebugRenderTree,
  Option,
  RenderNode,
} from '@glimmer/interfaces';
import { expect, assign, Stack, unwrapTemplate } from '@glimmer/util';
import { reifyArgs } from './vm/arguments';

interface InternalRenderNode<T extends object> extends RenderNode {
  bounds: Option<Bounds>;
  refs: Set<Ref<T>>;
  parent?: InternalRenderNode<T>;
}

let GUID = 0;

export class Ref<T extends object> {
  readonly id: number = GUID++;
  private value: Option<T>;

  constructor(value: T) {
    this.value = value;
  }

  get(): Option<T> {
    return this.value;
  }

  release(): void {
    if (DEBUG && this.value === null) {
      throw new Error('BUG: double release?');
    }

    this.value = null;
  }

  toString(): String {
    let label = `Ref ${this.id}`;

    if (this.value === null) {
      return `${label} (released)`;
    } else {
      try {
        return `${label}: ${this.value}`;
      } catch {
        return label;
      }
    }
  }
}

export default class DebugRenderTreeImpl<TBucket extends object>
  implements DebugRenderTree<TBucket> {
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
    });
    this.nodes.set(state, internalNode);
    this.appendChild(internalNode, state);
    this.enter(state);
  }

  update(state: TBucket): void {
    this.enter(state);
  }

  didRender(state: TBucket, bounds: Bounds): void {
    if (DEBUG && this.stack.current !== state) {
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
    let template = this.captureTemplate(node);
    let bounds = this.captureBounds(node);
    let children = this.captureRefs(refs);
    return { id, type, name, args: reifyArgs(args), instance, template, bounds, children };
  }

  private captureTemplate({ template }: InternalRenderNode<TBucket>): Option<string> {
    return (template && unwrapTemplate(template).moduleName) || null;
  }

  private captureBounds(node: InternalRenderNode<TBucket>): CapturedRenderNode['bounds'] {
    let bounds = expect(node.bounds, 'BUG: missing bounds');
    let parentElement = bounds.parentElement();
    let firstNode = bounds.firstNode();
    let lastNode = bounds.lastNode();
    return { parentElement, firstNode, lastNode };
  }
}
