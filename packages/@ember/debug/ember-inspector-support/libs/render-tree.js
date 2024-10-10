import captureRenderTree from './capture-render-tree';
import { guidFor } from '@ember/debug/ember-inspector-support/utils/ember/object/internals';
import { EmberLoader, emberSafeRequire } from '@ember/debug/ember-inspector-support/utils/ember/loader';
import { inspect } from '@ember/debug/ember-inspector-support/utils/type-check';
import { isInVersionSpecifier } from '@ember/debug/ember-inspector-support/utils/version';
import { VERSION } from '@ember/debug/ember-inspector-support/utils/ember';

class InElementSupportProvider {
  constructor(owner) {
    this.nodeMap = new Map();
    this.remoteRoots = [];
    this.runtime = this.require('@glimmer/runtime');
    this.reference = this.require('@glimmer/reference');
    try {
      this.Wormhole = requireModule('ember-wormhole/components/ember-wormhole');
    } catch (e) {
      // nope
    }

    try {
      requireModule(
        '@glimmer/manager'
      ).CustomModifierManager.prototype.getDebugInstance = (args) =>
        args.modifier || args.delegate;
    } catch (e) {
      // nope
    }

    this.DESTROY = emberSafeRequire('@glimmer/util')?.DESTROY;
    this.registerDestructor =
      emberSafeRequire('@glimmer/destroyable')?.registerDestructor ||
      emberSafeRequire('@ember/destroyable')?.registerDestructor ||
      emberSafeRequire('@ember/runtime')?.registerDestructor;

    this.debugRenderTree =
      owner.lookup('renderer:-dom')?.debugRenderTree ||
      owner.lookup('service:-glimmer-environment')._debugRenderTree;
    this.NewElementBuilder = this.runtime.NewElementBuilder;

    this.patch();
  }

  reset() {
    this.nodeMap.clear();
    this.remoteRoots.length = 0;
  }

  patch() {
    const self = this;

    const NewElementBuilder = this.NewElementBuilder;
    const componentStack = [];

    const enableModifierSupport =
      isInVersionSpecifier('>3.28.0', VERSION) &&
      !isInVersionSpecifier('>5.9.0', VERSION);
    const hasModifierAndInElementSupport = isInVersionSpecifier(
      '>5.9.0',
      VERSION
    );

    function createRef(value) {
      if (self.reference.createUnboundRef) {
        return self.reference.createUnboundRef(value);
      } else {
        return value;
      }
    }

    function createArgs(args) {
      if (self.reference.createUnboundRef) {
        return args;
      } else {
        return {
          value: () => args,
        };
      }
    }

    const appendChild = this.debugRenderTree.appendChild;
    this.debugRenderTree.appendChild = function (node, state) {
      if (node.type === 'component' || node.type === 'keyword') {
        componentStack.push(node);
      }
      return appendChild.call(this, node, state);
    };

    let currentElement = null;

    const captureNode = this.debugRenderTree.captureNode;
    this.debugRenderTree.captureNode = function (id, state) {
      const node = this.nodeFor(state);
      const res = captureNode.call(this, id, state);
      res.meta = node.meta;
      return res;
    };

    const exit = this.debugRenderTree.exit;
    this.debugRenderTree.exit = function (state) {
      const node = this.nodeFor(this.stack.current);
      if (node?.type === 'component' || node.type === 'keyword') {
        componentStack.pop();
      }
      return exit.call(this, state);
    };

    const enter = this.debugRenderTree.enter;
    this.debugRenderTree.enter = function (...args) {
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
    NewElementBuilder.prototype.didAppendNode = function (...args) {
      args[0].__emberInspectorParentNode = componentStack.at(-1);
      return didAppendNode.call(this, ...args);
    };

    const pushElement = NewElementBuilder.prototype.pushElement;
    NewElementBuilder.prototype.pushElement = function (...args) {
      pushElement.call(this, ...args);
      args[0].__emberInspectorParentNode = componentStack.at(-1);
    };

    const pushModifiers = NewElementBuilder.prototype.pushModifiers;
    if (enableModifierSupport && !hasModifierAndInElementSupport) {
      NewElementBuilder.prototype.pushModifiers = function (modifiers) {
        const debugRenderTree = self.debugRenderTree;
        if (debugRenderTree) {
          modifiers = modifiers || [];
          const modifier = modifiers[0];
          let element = null;
          if (modifiers.length) {
            element = modifier[1]?.element || modifier.state.element;
          }
          for (const modifier of modifiers) {
            const state = {};
            const modifierState =
              modifier.state?.instance || modifier.state || modifier[1];
            const instance = modifierState?.instance || modifierState?.delegate;
            let name =
              modifier.definition?.resolvedName ||
              modifierState?.debugName ||
              instance?.name;
            if (!name) {
              try {
                name = modifier.manager?.getDebugName?.();
              } catch (e) {
                // failed
              }
              name = name || 'unknown-modifier';
            }
            const args = {
              positional: [],
              named: {},
            };
            const positional =
              modifierState?.args?.positional?.references ||
              modifierState?.args?.positional ||
              [];
            for (const value of positional) {
              if (value && value[self.reference.REFERENCE]) {
                args.positional.push(value);
              } else {
                args.positional.push(createRef(value));
              }
            }
            let named = modifierState?.args?.named;
            if (!self.reference.createUnboundRef) {
              try {
                named = modifierState?.args?.named?.constructor;
              } catch (e) {
                //
              }
              try {
                named = named || modifierState?.args?.named?.map;
              } catch (e) {
                //
              }
            }
            for (const [key, value] of Object.entries(named || {})) {
              args.named[key] = createRef(value);
            }
            debugRenderTree?.create(state, {
              type: 'modifier',
              name,
              args: createArgs(args),
              instance: instance,
            });
            debugRenderTree?.didRender(state, {
              parentElement: () => element.parentElement,
              firstNode: () => element,
              lastNode: () => element,
            });
            self.registerDestructor(modifier.state, () => {
              debugRenderTree?.willDestroy(state);
            });
          }
        }
        return pushModifiers.call(this, modifiers);
      };
    }

    const pushRemoteElement = NewElementBuilder.prototype.pushRemoteElement;
    const popRemoteElement = NewElementBuilder.prototype.popRemoteElement;
    if (!hasModifierAndInElementSupport) {
      NewElementBuilder.prototype.pushRemoteElement = function (
        element,
        guid,
        insertBefore
      ) {
        const ref = createRef(element);
        const capturedArgs = {
          positional: [ref],
          named: {},
        };
        if (insertBefore) {
          capturedArgs.named.insertBefore = insertBefore;
        }
        const debugRenderTree = self.debugRenderTree;

        const r = pushRemoteElement.call(this, element, guid, insertBefore);
        const block = this.blockStack.current;

        if (this.DESTROY) {
          const destructor = block[this.DESTROY];
          block[this.DESTROY] = function () {
            self.debugRenderTree?.willDestroy(block);
            destructor.call(this);
          };
        } else {
          self.registerDestructor?.(block, () => {
            self.debugRenderTree?.willDestroy(block);
          });
        }

        debugRenderTree?.create(block, {
          type: 'keyword',
          name: 'in-element',
          args: createArgs(capturedArgs),
        });
        return r;
      };

      NewElementBuilder.prototype.popRemoteElement = function (...args) {
        const block = this.blockStack.current;
        popRemoteElement.call(this, ...args);
        const parentElement = this.element;
        const debugRenderTree = self.debugRenderTree;
        debugRenderTree?.didRender(block, {
          parentElement: () => parentElement,
          firstNode: () => block.firstNode(),
          lastNode: () => block.lastNode(),
        });
      };
    } else {
      NewElementBuilder.prototype.pushRemoteElement = function (...args) {
        currentElement = this.element;
        return pushRemoteElement.call(this, ...args);
      };
    }
    this.debugRenderTreeFunctions = {
      appendChild,
      exit,
    };
    this.NewElementBuilderFunctions = {
      pushElement,
      pushRemoteElement,
      popRemoteElement,
      didAppendNode,
      pushModifiers,
    };
  }

  teardown() {
    if (!this.NewElementBuilderFunctions) {
      return;
    }
    Object.assign(this.debugRenderTree, this.debugRenderTreeFunctions);
    Object.assign(
      this.NewElementBuilder.prototype,
      this.NewElementBuilderFunctions
    );
    this.NewElementBuilderFunctions = null;
  }

  require(req) {
    return requireModule.has(req)
      ? requireModule(req)
      : EmberLoader.require(req);
  }
}

export default class RenderTree {
  /**
   * Sets up the initial options.
   *
   * @method constructor
   * @param {Object} options
   *  - {owner}      owner           The Ember app's owner.
   *  - {Function}   retainObject    Called to retain an object for future inspection.
   */
  constructor({ owner, retainObject, releaseObject, inspectNode }) {
    this.owner = owner;
    this.retainObject = retainObject;
    this.releaseObject = releaseObject;
    this.inspectNode = inspectNode;
    this._reset();
    try {
      this.inElementSupport = new InElementSupportProvider(owner);
    } catch (e) {
      console.error('failed to setup in element support');
      console.error(e);
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
   *
   * @method build
   * @return {Array<SerializedRenderNode>} The render nodes tree.
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
   *
   * @param {string} id A render node id.
   * @return {Option<SerializedRenderNode>} A render node with the given id, if any.
   */
  find(id) {
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
   * @method findNearest
   * @param {Node} node A DOM node.
   * @param {string} hint The id of the last-matched render node (see comment below).
   * @return {Option<SerializedRenderNode>} The deepest enclosing render node, if any.
   */
  findNearest(node, hint) {
    // Use the hint if we are given one. When doing "live" inspecting, the mouse likely
    // hasn't moved far from its last location. Therefore, the matching render node is
    // likely to be the same render node, one of its children, or its parent. Knowing this,
    // we can heuristically start the search from the parent render node (which would also
    // match against this node and its children), then only fallback to matching the entire
    // tree when there is no match in this subtree.

    if (node.__emberInspectorParentElement) {
      node = node.__emberInspectorParentElement;
    }

    let hintNode = this._findUp(this.nodes[hint]);
    let hints = [hintNode];
    if (node.__emberInspectorParentNode) {
      const remoteNode = this.inElementSupport?.nodeMap.get(node);
      const n = remoteNode && this.nodes[remoteNode];
      hints.push(n);
    }

    hints = hints.filter((h) => !!h);
    let renderNode;

    const remoteRoots = this.inElementSupport?.remoteRoots || [];

    renderNode = this._matchRenderNodes(
      [...hints, ...remoteRoots, ...this.tree],
      node
    );

    if (renderNode) {
      return this._serializeRenderNode(renderNode);
    } else {
      return null;
    }
  }

  /**
   * Get the bounding rect for a given render node id.
   *
   * @method getBoundingClientRect
   * @param {*} id A render node id.
   * @return {Option<DOMRect>} The bounding rect, if the render node is found and has valid `bounds`.
   */
  getBoundingClientRect(id) {
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

    if (isSingleNode(bounds) && firstNode.getBoundingClientRect) {
      rect = firstNode.getBoundingClientRect();
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
   * @method getRange
   * @param {string} id A render node id.
   * @return {Option<Range>} The DOM range, if the render node is found and has valid `bounds`.
   */
  getRange(id) {
    let range = this.ranges[id];

    if (range === undefined) {
      let node = this.nodes[id];

      if (node && node.bounds && isAttached(node.bounds)) {
        range = document.createRange();
        range.setStartBefore(node.bounds.firstNode);
        range.setEndAfter(node.bounds.lastNode);
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
   * @method scrollIntoView
   * @param {string} id A render node id.
   */
  scrollIntoView(id) {
    let node = this.nodes[id];

    if (!node || node.bounds === null) {
      return;
    }

    let element = this._findNode(node.bounds, [Node.ELEMENT_NODE]);

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
   * @method inspectElement
   * @param {string} id A render node id.
   */
  inspectElement(id) {
    let node = this.nodes[id];

    if (!node || node.bounds === null) {
      return;
    }

    // We cannot inspect text nodes
    let target = this._findNode(node.bounds, [
      Node.ELEMENT_NODE,
      Node.COMMENT_NODE,
    ]);

    this.inspectNode(target);
  }

  teardown() {
    this._reset();
    this._releaseStaleObjects();
    this.inElementSupport?.teardown();
  }

  _reset() {
    this.tree = [];
    this.inElementSupport?.reset();
    this.nodes = Object.create(null);
    this.parentNodes = Object.create(null);
    this.serialized = Object.create(null);
    this.ranges = Object.create(null);
    this.previouslyRetainedObjects = this.retainedObjects || new Map();
    this.retainedObjects = new Map();
  }

  _createSimpleInstance(name, args) {
    const obj = Object.create(null);
    obj.args = args;
    obj.constructor = {
      name: name,
      comment: 'fake constructor',
    };
    return obj;
  }

  _insertHtmlElementNode(node, parentNode) {
    const element = node.bounds.firstNode;
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
    };
    const idx = parentNode.children.indexOf(node);
    parentNode.children.splice(idx, 0, htmlNode);
    return this._serializeRenderNode(htmlNode, parentNode);
  }

  _serializeRenderNodes(nodes, parentNode = null) {
    const mapped = [];
    // nodes can be mutated during serialize, which is why we use indexing instead of .map
    for (let i = 0; i < nodes.length; i++) {
      mapped.push(this._serializeRenderNode(nodes[i], parentNode));
    }
    return mapped;
  }

  _serializeRenderNode(node, parentNode = null) {
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
        this.inElementSupport?.nodeMap.set(node, node.id);
        this.inElementSupport?.remoteRoots.push(node);
      }

      if (
        this.inElementSupport?.Wormhole &&
        node.instance instanceof this.inElementSupport.Wormhole.default
      ) {
        this.inElementSupport?.remoteRoots.push(node);
        const bounds = node.bounds;
        Object.defineProperty(node, 'bounds', {
          get() {
            if (node.instance._destination) {
              return {
                firstNode: node.instance._destination,
                lastNode: node.instance._destination,
                parentElement: node.instance._destination.parentElement,
              };
            }
            return bounds;
          },
        });
      }

      if (parentNode) {
        this.parentNodes[node.id] = parentNode;
      }

      if (node.type === 'html-element') {
        // show set attributes in inspector
        Array.from(node.instance.attributes).forEach((attr) => {
          node.args.named[attr.nodeName] = attr.nodeValue;
        });
        // move modifiers and components into the element children
        parentNode.children.forEach((child) => {
          if (
            child.bounds.parentElement === node.instance ||
            child.meta?.parentElement === node.instance ||
            (child.type === 'modifier' &&
              child.bounds.firstNode === node.instance)
          ) {
            node.children.push(child);
          }
        });
        node.children.forEach((child) => {
          const idx = parentNode.children.indexOf(child);
          if (idx >= 0) {
            parentNode.children.splice(idx, 1);
          }
        });
      }

      if (node.type === 'component' && !node.instance) {
        if (
          node.name === '(unknown template-only component)' &&
          node.template?.endsWith('.hbs')
        ) {
          node.name = node.template
            .split(/\\|\//)
            .slice(-1)[0]
            .slice(0, -'.hbs'.length);
        }
        node.instance = this._createSimpleInstance(
          'TemplateOnlyComponent',
          node.args.named
        );
      }

      if (node.type === 'modifier') {
        node.name = node.name
          ?.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
          .replace(/^-/, '')
          .replace('-modifier', '');
        node.instance =
          node.instance || this._createSimpleInstance(node.name, node.args);
        node.instance.toString = () => node.name;
        if (parentNode.instance !== node.bounds.firstNode) {
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

  _serializeArgs({ named, positional }) {
    return {
      named: this._serializeDict(named),
      positional: this._serializeArray(positional),
    };
  }

  _serializeBounds(bounds) {
    if (bounds === null) {
      return null;
    } else if (isSingleNode(bounds)) {
      return 'single';
    } else {
      return 'range';
    }
  }

  _serializeDict(dict) {
    let result = Object.create(null);

    if ('__ARGS__' in dict) {
      dict = dict['__ARGS__'];
    }

    Object.keys(dict).forEach((key) => {
      result[key] = this._serializeItem(dict[key]);
    });

    return result;
  }

  _serializeArray(array) {
    return array.map((item) => this._serializeItem(item));
  }

  _serializeItem(item) {
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

  _serializeObject(object) {
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

  _getParent(id) {
    return this.parentNodes[id] || null;
  }

  _matchRenderNodes(renderNodes, dom, deep = true) {
    let candidates = [...renderNodes];

    while (candidates.length > 0) {
      let candidate = candidates.shift();
      let range = this.getRange(candidate.id);
      const isAllowed =
        candidate.type !== 'modifier' && candidate.type !== 'html-element';

      if (!isAllowed) {
        candidates.push(...candidate.children);
        continue;
      }

      if (isAllowed && range && range.isPointInRange(dom, 0)) {
        // We may be able to find a more exact match in one of the children.
        return (
          this._matchRenderNodes(candidate.children, dom, false) || candidate
        );
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

  _findNode(bounds, nodeTypes) {
    let node = bounds.firstNode;

    do {
      if (nodeTypes.indexOf(node.nodeType) > -1) {
        return node;
      } else {
        node = node.nextSibling;
      }
    } while (node && node !== bounds.lastNode);

    return node.meta?.parentElement || bounds.parentElement;
  }

  _findUp(node) {
    // Find the first parent render node with a different enclosing DOM element.
    // Usually, this is just the first parent render node, but there are cases where
    // multiple render nodes share the same bounds (e.g. outlet -> route template).
    let parentElement =
      node?.meta?.parentElement || node?.bounds?.parentElement;

    while (node && parentElement) {
      let parentNode = this._getParent(node.id);

      if (parentNode) {
        node = parentNode;

        if (
          parentElement ===
          (node?.meta?.parentElement || node?.bounds?.parentElement)
        ) {
          continue;
        }
      }

      break;
    }

    return node;
  }
}

function isSingleNode({ firstNode, lastNode }) {
  return firstNode === lastNode;
}

function isAttached({ firstNode, lastNode }) {
  return firstNode.isConnected && lastNode.isConnected;
}

function isEmptyRect({ x, y, width, height }) {
  return x === 0 && y === 0 && width === 0 && height === 0;
}
