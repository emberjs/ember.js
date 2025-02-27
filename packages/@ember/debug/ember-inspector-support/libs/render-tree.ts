import captureRenderTree from './capture-render-tree';
import { guidFor } from '@ember/debug/ember-inspector-support/utils/ember/object/internals';
import { inspect } from '@ember/debug/ember-inspector-support/utils/type-check';
import { CustomModifierManager } from '@glimmer/manager';
import * as GlimmerRuntime from '@glimmer/runtime';
import type { CapturedRenderNode } from '@glimmer/interfaces/lib/runtime/debug-render-tree';

declare module '@glimmer/interfaces/lib/runtime/debug-render-tree' {
  interface CapturedRenderNode {
    meta: {
      parentElement: HTMLBaseElement;
    };
  }
}

class InElementSupportProvider {
  nodeMap: Map<any, any>;
  remoteRoots: CapturedRenderNode[];
  Wormhole: any;
  debugRenderTree: any;
  NewElementBuilder: any;
  debugRenderTreeFunctions: { exit: any; enter: any } | undefined;
  NewElementBuilderFunctions: any;
  constructor(owner: any) {
    this.nodeMap = new Map();
    this.remoteRoots = [];
    try {
      // @ts-expect-error expected error
      this.Wormhole = requireModule('ember-wormhole/components/ember-wormhole');
    } catch {
      // nope
    }

    CustomModifierManager.prototype.getDebugInstance = (args) => args.modifier || args.delegate;

    this.debugRenderTree =
      owner.lookup('renderer:-dom')?.debugRenderTree ||
      owner.lookup('service:-glimmer-environment')._debugRenderTree;
    this.NewElementBuilder = GlimmerRuntime.NewElementBuilder;

    this.patch();
  }

  reset() {
    this.nodeMap.clear();
    this.remoteRoots.length = 0;
  }

  patch() {
    const NewElementBuilder = GlimmerRuntime.NewElementBuilder;
    const componentStack: any[] = [];
    let currentElement: any = null;

    const captureNode = this.debugRenderTree.captureNode;
    // this adds meta to the capture
    // https://github.com/glimmerjs/glimmer-vm/pull/1575
    this.debugRenderTree.captureNode = function (id: string, state: any) {
      const node = this.nodeFor(state);
      const res = captureNode.call(this, id, state);
      res.meta = node.meta;
      return res;
    };

    const exit = this.debugRenderTree.exit;
    this.debugRenderTree.exit = function (state: any) {
      const node = this.nodeFor(this.stack.current);
      if (node?.type === 'component' || node.type === 'keyword') {
        componentStack.pop();
      }
      return exit.call(this, state);
    };

    const enter = this.debugRenderTree.enter;
    // this is required to have the original parentElement for in-element
    // https://github.com/glimmerjs/glimmer-vm/pull/1575
    this.debugRenderTree.enter = function (...args: any) {
      enter.call(this, ...args);
      const node = this.nodeFor(args[0]);
      if (node?.type === 'keyword' && node.name === 'in-element') {
        node.meta = {
          parentElement: currentElement,
        };
      }
      return node;
    };

    const didAppendNode = NewElementBuilder.prototype.didAppendNode;
    // just some optimization for search later, not really needed
    // @ts-expect-error expected error
    NewElementBuilder.prototype.didAppendNode = function (...args: any) {
      args[0].__emberInspectorParentNode = componentStack.slice(-1)[0];
      // @ts-expect-error expected error
      return didAppendNode.call(this, ...args);
    };

    const pushElement = NewElementBuilder.prototype['pushElement'];
    NewElementBuilder.prototype['pushElement'] = function (...args: any) {
      // @ts-expect-error monkey patching... could be removed, just some perf gain
      pushElement.call(this, ...args);
      args[0].__emberInspectorParentNode = componentStack.slice(-1)[0];
    };

    // https://github.com/glimmerjs/glimmer-vm/pull/1575
    const pushRemoteElement = NewElementBuilder.prototype.pushRemoteElement;
    NewElementBuilder.prototype.pushRemoteElement = function (...args: any) {
      currentElement = this.element;
      // @ts-expect-error monkey patching...
      return pushRemoteElement.call(this, ...args);
    };

    this.debugRenderTreeFunctions = {
      enter,
      exit,
    };
    this.NewElementBuilderFunctions = {
      pushElement,
      pushRemoteElement,
      didAppendNode,
    };
  }

  teardown() {
    if (!this.NewElementBuilderFunctions) {
      return;
    }
    Object.assign(this.debugRenderTree, this.debugRenderTreeFunctions);
    Object.assign(this.NewElementBuilder.prototype, this.NewElementBuilderFunctions);
    this.NewElementBuilderFunctions = null;
  }
}

export default class RenderTree {
  declare tree: CapturedRenderNode[];
  declare owner: any;
  declare retainObject: any;
  declare releaseObject: any;
  declare inspectNode: (node: Node) => void;
  declare renderNodeIdPrefix: string;
  declare nodes: Record<string, CapturedRenderNode>;
  declare serialized: Record<string, any>;
  declare ranges: Record<string, Range | null | undefined>;
  declare parentNodes: any;
  declare previouslyRetainedObjects: any;
  declare retainedObjects: any;
  declare inElementSupport: InElementSupportProvider | undefined;
  /**
   * Sets up the initial options.
   *
   * @param {Object} options
   *  - {owner}      owner           The Ember app's owner.
   *  - {Function}   retainObject    Called to retain an object for future inspection.
   */
  constructor({
    owner,
    retainObject,
    releaseObject,
    inspectNode,
  }: {
    owner: any;
    retainObject: any;
    releaseObject: any;
    inspectNode: (node: Node) => void;
  }) {
    this.owner = owner;
    this.retainObject = retainObject;
    this.releaseObject = releaseObject;
    this.inspectNode = inspectNode;
    this._reset();
    try {
      this.inElementSupport = new InElementSupportProvider(owner);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('failed to setup in element support', e);
      // not supported
    }

    // need to have different ids per application / iframe
    // to distinguish the render nodes it in the inspector
    // between apps
    this.renderNodeIdPrefix = guidFor(this);
  }

  /**
   * Capture the render tree and serialize it for sending.
   *
   * This returns an array of `SerializedRenderNode`:
   *
   * type SerializedItem = string | number | bigint | boolean | null | undefined | { id: string };
   *
   * interface SerializedRenderNode {
   *   id: string;
   *   type: 'outlet' | 'engine' | 'route-template' | 'component';
   *   name: string;
   *   args: {
   *     named: Dict<SerializedItem>;
   *     positional: SerializedItem[];
   *   };
   *   instance: SerializedItem;
   *   template: Option<string>;
   *   bounds: Option<'single' | 'range'>;
   *   children: SerializedRenderNode[];
   * }
   */
  build() {
    this._reset();

    this.tree = captureRenderTree(this.owner);
    let serialized = this._serializeRenderNodes(this.tree);

    this._releaseStaleObjects();

    return serialized;
  }

  /**
   * Find a render node by id.
   */
  find(id: string): CapturedRenderNode | null {
    let node = this.nodes[id];

    if (node) {
      return this._serializeRenderNode(node);
    } else {
      return null;
    }
  }

  /**
   * Find the deepest enclosing render node for a given DOM node.
   *
   * @param {Node} node A DOM node.
   * @param {string} hint The id of the last-matched render node (see comment below).
   * @return {Option<SerializedRenderNode>} The deepest enclosing render node, if any.
   */
  findNearest(
    node: Node & { __emberInspectorParentElement: any; __emberInspectorParentNode: any },
    hint?: string
  ) {
    // Use the hint if we are given one. When doing "live" inspecting, the mouse likely
    // hasn't moved far from its last location. Therefore, the matching render node is
    // likely to be the same render node, one of its children, or its parent. Knowing this,
    // we can heuristically start the search from the parent render node (which would also
    // match against this node and its children), then only fallback to matching the entire
    // tree when there is no match in this subtree.

    if (node.__emberInspectorParentElement) {
      node = node.__emberInspectorParentElement;
    }

    let hintNode = this._findUp(this.nodes[hint!]);
    let hints = [hintNode!];
    if (node.__emberInspectorParentNode) {
      const remoteNode = this.inElementSupport?.nodeMap.get(node);
      const n = remoteNode && this.nodes[remoteNode];
      hints.push(n);
    }

    hints = hints.filter((h) => Boolean(h));
    let renderNode;

    const remoteRoots = this.inElementSupport?.remoteRoots || [];

    renderNode = this._matchRenderNodes([...hints, ...remoteRoots, ...this.tree], node);

    if (renderNode) {
      return this._serializeRenderNode(renderNode);
    } else {
      return null;
    }
  }

  /**
   * Get the bounding rect for a given render node id.
   *
   * @param {*} id A render node id.
   * @return {Option<DOMRect>} The bounding rect, if the render node is found and has valid `bounds`.
   */
  getBoundingClientRect(id: string) {
    let node = this.nodes[id];

    if (!node || !node.bounds) {
      return null;
    }

    // Element.getBoundingClientRect seems to be less buggy when it comes
    // to taking hidden (clipped) content into account, so prefer that over
    // Range.getBoundingClientRect when possible.

    let rect;
    let { bounds } = node;
    let { firstNode } = bounds;

    if (isSingleNode(bounds) && (firstNode as unknown as HTMLElement).getBoundingClientRect) {
      rect = (firstNode as unknown as HTMLElement).getBoundingClientRect();
    } else {
      rect = this.getRange(id)?.getBoundingClientRect();
    }

    if (rect && !isEmptyRect(rect)) {
      return rect;
    }

    return null;
  }

  /**
   * Get the DOM range for a give render node id.
   *
   * @param {string} id A render node id.
   * @return {Option<Range>} The DOM range, if the render node is found and has valid `bounds`.
   */
  getRange(id: string) {
    let range = this.ranges[id];

    if (range === undefined) {
      let node = this.nodes[id];

      if (node && node.bounds && isAttached(node.bounds)) {
        range = document.createRange();
        range.setStartBefore(node.bounds.firstNode as unknown as Node);
        range.setEndAfter(node.bounds.lastNode as unknown as Node);
      } else {
        // If the node has already been detached, we probably have a stale tree
        range = null;
      }

      this.ranges[id] = range;
    }

    return range;
  }

  /**
   * Scroll the given render node id into view (if the render node is found and has valid `bounds`).
   *
   * @param {string} id A render node id.
   */
  scrollIntoView(id: string) {
    let node = this.nodes[id];

    if (!node || node.bounds === null) {
      return;
    }

    let element = this._findNode(node, [Node.ELEMENT_NODE]);

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }

  /**
   * Inspect the bounds for the given render node id in the "Elements" panel (if the render node
   * is found and has valid `bounds`).
   *
   * @param {string} id A render node id.
   */
  inspectElement(id: string) {
    let node = this.nodes[id];

    if (!node || node.bounds === null) {
      return;
    }

    // We cannot inspect text nodes
    let target = this._findNode(node, [Node.ELEMENT_NODE, Node.COMMENT_NODE]);

    this.inspectNode(target);
  }

  teardown() {
    this._reset();
    this._releaseStaleObjects();
  }

  _reset() {
    this.tree = [];
    this.nodes = Object.create(null);
    this.parentNodes = Object.create(null);
    this.serialized = Object.create(null);
    this.ranges = Object.create(null);
    this.previouslyRetainedObjects = this.retainedObjects || new Map();
    this.retainedObjects = new Map();
  }

  _createSimpleInstance(name: string, args: any) {
    const obj = Object.create(null);
    obj.args = args;
    obj.constructor = {
      name: name,
      comment: 'fake constructor',
    };
    return obj;
  }

  _insertHtmlElementNode(node: CapturedRenderNode, parentNode?: CapturedRenderNode | null): any {
    const element = node.bounds!.firstNode as unknown as HTMLElement;
    const htmlNode = {
      id: node.id + 'html-element',
      type: 'html-element',
      name: element.tagName.toLowerCase(),
      instance: element,
      template: null,
      bounds: {
        firstNode: element,
        lastNode: element,
        parentElement: element.parentElement,
      },
      args: {
        named: {},
        positional: [],
      },
      children: [],
    } as unknown as CapturedRenderNode;
    const idx = parentNode!.children.indexOf(node);
    parentNode!.children.splice(idx, 0, htmlNode);
    return this._serializeRenderNode(htmlNode, parentNode);
  }

  _serializeRenderNodes(nodes: CapturedRenderNode[], parentNode: CapturedRenderNode | null = null) {
    const mapped = [];
    // nodes can be mutated during serialize, which is why we use indexing instead of .map
    for (let i = 0; i < nodes.length; i++) {
      mapped.push(this._serializeRenderNode(nodes[i]!, parentNode));
    }
    return mapped;
  }

  _serializeRenderNode(node: CapturedRenderNode, parentNode: CapturedRenderNode | null = null) {
    if (!node.id.startsWith(this.renderNodeIdPrefix)) {
      node.id = `${this.renderNodeIdPrefix}-${node.id}`;
    }
    let serialized = this.serialized[node.id];

    if (serialized === undefined) {
      this.nodes[node.id] = node;
      if (node.type === 'keyword' && node.name === 'in-element') {
        node.type = 'component';
        node.instance = {
          args: node.args,
          constructor: {
            name: 'InElement',
          },
        };
      }

      if (
        this.inElementSupport?.Wormhole &&
        node.instance instanceof this.inElementSupport.Wormhole.default
      ) {
        this.inElementSupport?.remoteRoots.push(node);
        const bounds = node.bounds;
        Object.defineProperty(node, 'bounds', {
          get() {
            const instance = node.instance as any;
            if ((node.instance as any)._destination) {
              return {
                firstNode: instance._destination,
                lastNode: instance._destination,
                parentElement: instance._destination.parentElement,
              };
            }
            return bounds;
          },
        });
      }

      if (parentNode) {
        this.parentNodes[node.id] = parentNode;
      }

      if ((node.type as string) === 'html-element') {
        // show set attributes in inspector
        const instance = node.instance as HTMLElement;
        Array.from(instance.attributes).forEach((attr) => {
          node.args.named[attr.nodeName] = attr.nodeValue;
        });
        // move modifiers and components into the element children
        parentNode!.children.forEach((child) => {
          if (
            (child.bounds!.parentElement as unknown as HTMLElement) === instance ||
            child.meta?.parentElement === instance ||
            (child.type === 'modifier' && (child as any).bounds.firstNode === instance)
          ) {
            node.children.push(child);
          }
        });
        node.children.forEach((child) => {
          const idx = parentNode!.children.indexOf(child);
          if (idx >= 0) {
            parentNode!.children.splice(idx, 1);
          }
        });
      }

      if (node.type === 'component' && !node.instance) {
        if (node.name === '(unknown template-only component)' && node.template?.endsWith('.hbs')) {
          node.name = node.template.split(/\\|\//).slice(-1)[0]!.slice(0, -'.hbs'.length);
        }
        node.instance = this._createSimpleInstance('TemplateOnlyComponent', node.args.named);
      }

      if (node.type === 'modifier') {
        node.name = node.name
          ?.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
          .replace(/^-/, '')
          .replace('-modifier', '');
        node.instance = node.instance || this._createSimpleInstance(node.name, node.args);
        (node.instance as any).toString = () => node.name;
        if (parentNode!.instance !== node.bounds!.firstNode) {
          return this._insertHtmlElementNode(node, parentNode);
        }
      }

      this.serialized[node.id] = serialized = {
        ...node,
        meta: null,
        args: this._serializeArgs(node.args),
        instance: this._serializeItem(node.instance),
        bounds: this._serializeBounds(node.bounds),
        children: this._serializeRenderNodes(node.children, node),
      };
    }

    return serialized;
  }

  _serializeArgs({ named, positional }: any) {
    return {
      named: this._serializeDict(named),
      positional: this._serializeArray(positional),
    };
  }

  _serializeBounds(bounds: any) {
    if (bounds === null) {
      return null;
    } else if (isSingleNode(bounds)) {
      return 'single';
    } else {
      return 'range';
    }
  }

  _serializeDict(dict: any) {
    let result = Object.create(null);

    if ('__ARGS__' in dict) {
      dict = dict['__ARGS__'];
    }

    Object.keys(dict).forEach((key) => {
      result[key] = this._serializeItem(dict[key]);
    });

    return result;
  }

  _serializeArray(array: any[]) {
    return array.map((item) => this._serializeItem(item));
  }

  _serializeItem(item: any) {
    switch (typeof item) {
      case 'string':
      case 'number':
      case 'bigint':
      case 'boolean':
      case 'undefined':
        return item;

      default:
        return item && this._serializeObject(item);
    }
  }

  _serializeObject(object: any) {
    let id = this.previouslyRetainedObjects.get(object);

    if (id === undefined) {
      id = this.retainObject(object);
    }

    this.retainedObjects.set(object, id);

    return { id, type: typeof object, inspect: inspect(object) };
  }

  _releaseStaleObjects() {
    // The object inspector already handles ref-counting. So doing the same
    // bookkeeping here may seem redundant, and it is. However, in practice,
    // calling `retainObject` and `dropObject` could be quite expensive and
    // we call them a lot. Also, temporarily dropping the ref-count to 0 just
    // to re-increment it later (which is what would happen if we release all
    // current objects before the walk, then re-retain them as we walk the
    // new tree) is especially bad, as it triggers the initialization and
    // clean up logic on each of these objects. In my (GC's) opinion, the
    // object inspector is likely overly eager and doing too much bookkeeping
    // when we can be using weakmaps. Until we have a chance to revamp the
    // object inspector, the logic here tries to reduce the number of retain
    // and release calls by diffing the object set betweeen walks. Feel free
    // to remove this code and revert to the old release-then-retain method
    // when the object inspector is not slow anymore.

    let { previouslyRetainedObjects, retainedObjects, releaseObject } = this;

    // The object inspector should make its own GC async, but until then...
    window.setTimeout(function () {
      for (let [object, id] of previouslyRetainedObjects) {
        if (!retainedObjects.has(object)) {
          releaseObject(id);
        }
      }
    }, 0);

    this.previouslyRetainedObjects = null;
  }

  _getParent(id: string) {
    return this.parentNodes[id] || null;
  }

  _matchRenderNodes(
    renderNodes: CapturedRenderNode[],
    dom: Node,
    deep = true
  ): CapturedRenderNode | null {
    let candidates = [...renderNodes];

    while (candidates.length > 0) {
      let candidate = candidates.shift()!;
      let range = this.getRange(candidate.id);
      const isAllowed = candidate.type !== 'modifier' && (candidate as any).type !== 'html-element';

      if (!isAllowed) {
        candidates.push(...candidate.children);
        continue;
      }

      if (isAllowed && range && range.isPointInRange(dom, 0)) {
        // We may be able to find a more exact match in one of the children.
        return this._matchRenderNodes(candidate.children, dom, false) || candidate;
      } else if (!range || deep) {
        // There are some edge cases of non-containing parent nodes (e.g. "worm
        // hole") so we can't rule out the entire subtree just because the parent
        // didn't match. However, we should come back to this subtree at the end
        // since we are unlikely to find a match here.
        candidates.push(...candidate.children);
      } else {
        // deep = false: In this case, we already found a matching parent,
        // we are just trying to find a more precise match here. If the child
        // does not contain the DOM node, we don't need to travese further.
      }
    }

    return null;
  }

  _findNode(capturedNode: CapturedRenderNode, nodeTypes: number[]): HTMLBaseElement {
    let node = capturedNode.bounds!.firstNode;

    do {
      if (nodeTypes.indexOf(node.nodeType) > -1) {
        return node as unknown as HTMLBaseElement;
      } else {
        node = node.nextSibling!;
      }
    } while (node && node !== capturedNode.bounds!.lastNode);

    return capturedNode.meta?.parentElement || capturedNode.bounds!.parentElement;
  }

  _findUp(node?: CapturedRenderNode) {
    // Find the first parent render node with a different enclosing DOM element.
    // Usually, this is just the first parent render node, but there are cases where
    // multiple render nodes share the same bounds (e.g. outlet -> route template).
    let parentElement = node?.meta?.parentElement || node?.bounds?.parentElement;

    while (node && parentElement) {
      let parentNode = this._getParent(node.id);

      if (parentNode) {
        node = parentNode;

        if (parentElement === (node?.meta?.parentElement || node?.bounds?.parentElement)) {
          continue;
        }
      }

      break;
    }

    return node;
  }
}

function isSingleNode({ firstNode, lastNode }: any) {
  return firstNode === lastNode;
}

function isAttached({ firstNode, lastNode }: any) {
  return firstNode.isConnected && lastNode.isConnected;
}

function isEmptyRect({ x, y, width, height }: any) {
  return x === 0 && y === 0 && width === 0 && height === 0;
}
