import type { Nullable } from '../core.js';
import type { Bounds } from './bounds.js';
import type {
  AttrNamespace,
  ElementNamespace,
  SimpleComment,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
} from './simple.js';

/**
 * Every operation that the VM does on the output tree.
 *
 * The VM holds nodes only as handles.
 * It gets them from this interface, and it gives them back to this interface.
 * It does not read or write a member of a node.
 *
 * An implementation for a different output, for example a terminal,
 * implements the same methods on its own node objects.
 *
 * Not part of this interface:
 *
 * - how to read a value from an object (`getProp`, `toBool`, `toIterator`)
 * - how to find a component, helper, or modifier
 * - managers
 *
 * These are the same for each output.
 */
export interface DOMRenderer {
  /**
   * ---------------------------------------------------------------------------
   * Create
   * ---------------------------------------------------------------------------
   */

  /**
   * `context` is the element that will contain the new element.
   * The implementation uses it to select the namespace.
   */
  createElement(tag: string, context?: SimpleElement): SimpleElement;
  createElementNS(namespace: ElementNamespace, tag: string): SimpleElement;
  createTextNode(text: string): SimpleText;
  createComment(data: string): SimpleComment;

  /**
   * ---------------------------------------------------------------------------
   * Change the tree
   * ---------------------------------------------------------------------------
   */

  /**
   * A `reference` of `null` appends `node` to `parent`.
   */
  insertBefore(parent: SimpleElement, node: SimpleNode, reference: Nullable<SimpleNode>): void;

  /**
   * Parses `html` and inserts the result.
   * The returned bounds are never empty.
   */
  insertHTMLBefore(parent: SimpleElement, reference: Nullable<SimpleNode>, html: string): Bounds;
  removeChild(parent: SimpleElement, node: SimpleNode): void;
  clearChildren(element: SimpleElement): void;

  /**
   * ---------------------------------------------------------------------------
   * Read the tree
   * ---------------------------------------------------------------------------
   */

  parentNode(node: SimpleNode): Nullable<SimpleNode>;
  firstChild(node: SimpleNode): Nullable<SimpleNode>;
  lastChild(node: SimpleNode): Nullable<SimpleNode>;
  nextSibling(node: SimpleNode): Nullable<SimpleNode>;
  previousSibling(node: SimpleNode): Nullable<SimpleNode>;
  querySelector(element: SimpleElement, selector: string): Nullable<SimpleElement>;

  /**
   * ---------------------------------------------------------------------------
   * Read a node
   * ---------------------------------------------------------------------------
   */

  /**
   * `isNode` and `isFragment` take any value.
   * The VM uses them on values that a template renders with `{{value}}`.
   */
  isNode(value: unknown): value is SimpleNode;
  isFragment(value: unknown): value is SimpleDocumentFragment;
  isElement(node: SimpleNode): node is SimpleElement;
  isText(node: SimpleNode): node is SimpleText;
  isComment(node: SimpleNode): node is SimpleComment;
  tagName(element: SimpleElement): string;
  namespaceURI(element: SimpleElement): Nullable<string>;

  /**
   * The text of a text node or of a comment.
   */
  nodeValue(node: SimpleNode): Nullable<string>;
  setNodeValue(node: SimpleNode, value: string): void;

  /**
   * ---------------------------------------------------------------------------
   * Attributes and properties
   * ---------------------------------------------------------------------------
   */

  attributeNames(element: SimpleElement): string[];
  getAttribute(element: SimpleElement, name: string): Nullable<string>;
  setAttribute(
    element: SimpleElement,
    name: string,
    value: string,
    namespace?: Nullable<AttrNamespace>
  ): void;
  removeAttribute(element: SimpleElement, name: string, namespace?: Nullable<AttrNamespace>): void;
  hasProperty(element: SimpleElement, name: string): boolean;
  getProperty(element: SimpleElement, name: string): unknown;
  setProperty(element: SimpleElement, name: string, value: unknown): void;

  /**
   * ---------------------------------------------------------------------------
   * Events
   * ---------------------------------------------------------------------------
   */

  addEventListener(
    element: SimpleElement,
    eventName: string,
    callback: EventListener,
    options?: AddEventListenerOptions
  ): void;
  removeEventListener(
    element: SimpleElement,
    eventName: string,
    callback: EventListener,
    options?: AddEventListenerOptions
  ): void;
}
