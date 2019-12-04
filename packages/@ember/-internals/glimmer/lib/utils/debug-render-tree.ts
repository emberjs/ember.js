import { assert } from '@ember/debug';
import { Bounds, CapturedArguments, Option } from '@glimmer/interfaces';
import { unwrapTemplate } from '@glimmer/opcode-compiler';
import { expect, Stack } from '@glimmer/util';
import { SimpleElement, SimpleNode } from '@simple-dom/interface';
import { OwnedTemplate } from '../template';
import { VersionedPathReference } from '@glimmer/reference';

export type RenderNodeType = 'outlet' | 'engine' | 'route-template' | 'component';

export type PathNodeType = 'root' | 'argument' | 'property' | 'iterator';

export interface RenderNode {
  type: RenderNodeType;
  name: string;
  args: CapturedArguments;
  instance: unknown;
  template?: OwnedTemplate;
}

interface InternalRenderNode<T extends object> extends RenderNode {
  bounds: Option<Bounds>;
  refs: Set<Ref<T>>;
  paths: Set<InternalPathNode<T>>;
  parent?: InternalRenderNode<T>;
}

interface InternalPathNode<T extends object> {
  name: string;
  type: PathNodeType;
  parent: InternalPathNode<T> | InternalRenderNode<T>;
  paths: Set<InternalPathNode<T>>;
}

export interface CapturedRenderNode {
  id: string;
  type: RenderNodeType;
  name: string;
  args: ReturnType<CapturedArguments['value']>;
  instance: unknown;
  template: Option<string>;
  bounds: Option<{
    parentElement: SimpleElement;
    firstNode: SimpleNode;
    lastNode: SimpleNode;
  }>;
  children: CapturedRenderNode[];
}

let GUID = 0;

function isPathNode<T extends object>(node: RenderNode | InternalPathNode<T>): node is InternalPathNode<T> {
  return (
    node.type === 'root' ||
    node.type === 'argument' ||
    node.type === 'property' ||
    node.type === 'iterator'
  );
}

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
    assert('BUG: double release?', this.value !== null);
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

const _repeat =
  String.prototype.repeat ||
  function(this: string, count: number) {
    return new Array(count + 1).join(this);
  };

function repeatString(str: string, count: number) {
  return _repeat.call(str, count);
}

export default class DebugRenderTree<Bucket extends object = object> {
  private stack = new Stack<Bucket>();

  private refs = new WeakMap<Bucket, Ref<Bucket>>();
  private roots = new Set<Ref<Bucket>>();
  private nodes = new WeakMap<Bucket, InternalRenderNode<Bucket>>();
  private pathNodes = new WeakMap<VersionedPathReference, InternalPathNode<Bucket>>();

  begin(): void {
    this.reset();
  }

  create(state: Bucket, node: RenderNode): void {
    let internalNode: InternalRenderNode<Bucket> = {
      ...node,
      bounds: null,
      refs: new Set(),
      paths: new Set(),
    };
    this.nodes.set(state, internalNode);
    this.appendChild(internalNode, state);
    this.enter(state);
  }

  update(state: Bucket): void {
    this.enter(state);
  }

  // for dynamic layouts
  setTemplate(state: Bucket, template: OwnedTemplate): void {
    this.nodeFor(state).template = template;
  }

  didRender(state: Bucket, bounds: Bounds): void {
    assert(`BUG: expecting ${this.stack.current}, got ${state}`, this.stack.current === state);
    this.nodeFor(state).bounds = bounds;
    this.exit();
  }

  willDestroy(state: Bucket): void {
    expect(this.refs.get(state), 'BUG: missing ref').release();
  }

  commit(): void {
    this.reset();
  }

  capture(): CapturedRenderNode[] {
    return this.captureRefs(this.roots);
  }

  createPath(
    pathRef: VersionedPathReference,
    name: string,
    type: PathNodeType,
    parentRef: Option<VersionedPathReference>
  ) {
    assert(
      'BUG: Attempted to register a path that had already been registered',
      !this.pathNodes.has(pathRef)
    );

    let { current } = this.stack;

    if (current === null) {
      // Not currently in a rendering context, don't register the node
      return;
    }

    let currentNode = expect(
      this.nodes.get(current),
      'BUG: Attempted to create a path, but there is no current render node'
    );

    let parent: InternalPathNode<Bucket> | InternalRenderNode<Bucket>;

    if (parentRef === null) {
      parent = currentNode;
    } else {
      let { named } = currentNode.args;
      let refIndex = named.references.indexOf(parentRef);

      if (refIndex !== -1) {
        parent = {
          parent: currentNode,
          type: 'argument',
          name: `@${named.names[refIndex]}`,
          paths: new Set(),
        };
      } else if (this.pathNodes.has(parentRef)) {
        parent = this.pathNodes.get(parentRef)!;
      } else {
        // Some RootReferences get created before a component context has been
        // setup (root, curly). This is mainly because the debugRenderTree is
        // tied to the manager hooks, and not built into the VM directly. In
        // these cases, we setup the path lazily when the first property is
        // accessed.

        this.createPath(parentRef, 'this', 'root', null);

        parent = this.pathNodes.get(parentRef)!;
      }

    }

    let pathNode: InternalPathNode<Bucket> = {
      name,
      type,
      parent,
      paths: new Set(),
    };

    parent.paths.add(pathNode);

    this.pathNodes.set(pathRef, pathNode);
  }

  logRenderStackForPath(pathRef: VersionedPathReference): string {
    let node: InternalRenderNode<Bucket> | InternalPathNode<Bucket> | undefined = expect(
      this.pathNodes.get(pathRef),
      'BUG: Attempted to create a log for a path reference, but no node exist for that reference'
    );

    let pathParts = [];

    while (node !== undefined && isPathNode(node)) {
      if (node.type === 'iterator') {
        // Iterator items are a combination of their own name (the key of the item) and
        // their parent, the iterable itself.
        let part = `${node.parent.name}[${node.name}]`;
        pathParts.push(part);

        node = node.parent;
      } else {
        pathParts.push(node.name);
      }

      node = node.parent;
    }

    let messageParts = [pathParts.join('.')];

    while (node !== undefined) {
      if (node.type === 'outlet' || node.name === '-top-level') {
        node = node.parent;
        continue;
      }

      messageParts.unshift(node.name);
      node = node.parent;
    }

    messageParts.map((part, index) => `${repeatString(' ', index * 2)}${part}`);

    return messageParts.join('\n');
  }

  private reset(): void {
    if (this.stack.size !== 0) {
      // We probably encountered an error during the rendering loop. This will
      // likely trigger undefined behavior and memory leaks as the error left
      // things in an inconsistent state. It is recommended that the user
      // refresh the page.

      // TODO: We could warn here? But this happens all the time in our tests?

      while (!this.stack.isEmpty()) {
        this.stack.pop();
      }
    }
  }

  private enter(state: Bucket): void {
    this.stack.push(state);
  }

  private exit(): void {
    assert('BUG: unbalanced pop', this.stack.size !== 0);
    this.stack.pop();
  }

  private nodeFor(state: Bucket): InternalRenderNode<Bucket> {
    return expect(this.nodes.get(state), 'BUG: missing node');
  }

  private appendChild(node: InternalRenderNode<Bucket>, state: Bucket): void {
    assert('BUG: child already appended', !this.refs.has(state));

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

  private captureRefs(refs: Set<Ref<Bucket>>): CapturedRenderNode[] {
    let captured: CapturedRenderNode[] = [];

    refs.forEach(ref => {
      let state = ref.get();

      if (state) {
        captured.push(this.captureNode(`render-node:${ref.id}`, state));
      } else {
        refs.delete(ref);
      }
    });

    return captured;
  }

  private captureNode(id: string, state: Bucket): CapturedRenderNode {
    let node = this.nodeFor(state);
    let { type, name, args, instance, refs } = node;
    let template = this.captureTemplate(node);
    let bounds = this.captureBounds(node);
    let children = this.captureRefs(refs);
    return { id, type, name, args: args.value(), instance, template, bounds, children };
  }

  private captureTemplate({ template }: InternalRenderNode<Bucket>): Option<string> {
    return (template && unwrapTemplate(template).referrer.moduleName) || null;
  }

  private captureBounds(node: InternalRenderNode<Bucket>): CapturedRenderNode['bounds'] {
    let bounds = expect(node.bounds, 'BUG: missing bounds');
    let parentElement = bounds.parentElement();
    let firstNode = bounds.firstNode();
    let lastNode = bounds.lastNode();
    return { parentElement, firstNode, lastNode };
  }
}
