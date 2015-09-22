import { Bounds, ConcreteBounds, Morph, MorphSpecializer, MorphList } from './morph';
import { Frame } from './environment';
import DOMHelper from './dom';

// Builders are created for each template the first time it is rendered.
// The builder walks through all statements, static and dynamic, and
// returns a result containing just the static statements with the
// dynamic morphs created for the statements. Subsequent rerenders
// can simply walk over the statements and apply them to the morphs.
export default class Builder {
  private frame: Frame;
  private parentMorph: Morph<Object>;
  private stack: ElementStack;
  private morphs: Morph<Object>[];

  constructor(morph, frame) {
    this.frame = frame;

    this.parentMorph = morph;
    this.stack = new ElementStack({ builder: this, frame, morph });
    this.morphs = [];
  }

  morphList(): MorphList {
    return this.morphs;
  }

  bounds(): Bounds {
    return this.stack.bounds();
  }

  /// Interaction with ElementStack

  createMorph<InitOptions>(Type: MorphSpecializer<InitOptions>, attrs: InitOptions, parentElement: Element): Morph<InitOptions> {
    let morph = this.initializeMorph(Type, attrs, parentElement);
    this.morphs.push(morph);
    return morph;
  }

  initializeMorph<InitOptions>(Type: MorphSpecializer<InitOptions>, attrs: InitOptions, parentElement: Element): Morph<InitOptions> {
    let SpecializedType = Type.specialize(attrs);
    let morph = new SpecializedType(parentElement, this.frame);
    morph.init(attrs);
    return morph;
  }

  /// Utilities

  render(statement) {
    let { stack, frame } = this;

    if (statement.isStatic) {
      statement.evaluate(stack);
      return;
    }

    //let syntaxExtension = _frame.syntaxExtension(statement);
    let content = statement.evaluate(stack, frame);
    content.append(stack);
  }
}

export class ElementStack {
  private builder: Builder;
  private frame: Frame;
  private dom: DOMHelper;
  private morph: Morph<Object>;
  private element: Element;
  private nextSibling: Node;
  private elementStack: Element[];
  private nextSiblingStack: Node[];
  public firstNode: Node;
  public lastNode: Node;
  public operations: Operations;

  constructor({ builder, frame, morph }) {
    this.builder = builder;
    this.frame = frame;
    this.dom = frame.dom();
    this.morph = morph;
    this.operations = new TopLevelOperations(this);
    this.element = morph.parentNode;
    this.nextSibling = morph.nextSibling;
    this.elementStack = [morph.parentNode];
    this.nextSiblingStack = [morph.nextSibling];

    this.firstNode = null;
    this.lastNode = null;
  }

  bounds(): Bounds {
    return {
      firstNode: () => this.firstNode,
      lastNode: () => this.lastNode,
      parentNode: () => this.element
    };
  }

  _pushElement(element) {
    this.elementStack.push(element);
    this.nextSiblingStack.push(null);
    this.element = element;
  }

  _popElement() {
    let { elementStack, nextSiblingStack }  = this;
    let topElement = elementStack.pop();
    nextSiblingStack.pop();
    this.element = elementStack[elementStack.length - 1];
    this.nextSibling = nextSiblingStack[nextSiblingStack.length - 1];
    return topElement;
  }

  appendStatement(statement) {
    this.builder.render(statement);
  }

  createMorph<InitOptions>(Type: MorphSpecializer<InitOptions>, attrs: InitOptions): Morph<InitOptions> {
    return this.builder.createMorph(Type, attrs, this.element);
  }

  initializeMorph<InitOptions>(Type: MorphSpecializer<InitOptions>, attrs: InitOptions): Morph<InitOptions> {
    return this.builder.initializeMorph(Type, attrs, this.element);
  }

  appendMorph(Type, attrs) {
    this.createMorph(Type, attrs).append(this);
  }

  setAttribute(name, value) {
    this.dom.setAttribute(<HTMLElement>this.element, name, value);
  }

  setAttributeNS(name, value, namespace) {
    this.dom.setAttributeNS(this.element, name, value, namespace);
  }

  appendText(text): Text {
    return this.operations.appendText(text);
  }

  _appendText(text): Text {
    let node = this.dom.createTextNode(text);
    this.dom.insertBefore(this.element, node, this.nextSibling);
    return node;
  }

  appendComment(comment): Comment {
    return this.operations.appendComment(comment);
  }

  _appendComment(comment): Comment {
    let node = this.dom.createComment(comment);
    this.dom.insertBefore(this.element, node, this.nextSibling);
    return node;
  }

  openElement(tag): Element {
    return this.operations.openElement(tag);
  }

  _openElement(tag): Element {
    let element = this.dom.createElement(tag, this.element);
    this._pushElement(element);
    return element;
  }

  closeElement() {
    this.operations.closeElement();
  }

  _closeElement() {
    let child = this._popElement();
    this.dom.insertBefore(this.element, child, this.nextSibling);
  }

  insertHTMLBefore(nextSibling: Node, html: string): Bounds {
    let { first, last } = this.operations.insertHTMLBefore(nextSibling, html);
    return new ConcreteBounds(this.element, first, last);
  }

  _insertHTMLBefore(nextSibling: Node, html: string): { first: Node, last: Node } {
    if (!(this.element instanceof HTMLElement)) {
      throw new Error(`You cannot insert HTML (using triple-curlies or htmlSafe) into an SVG context: ${this.element.tagName}`)
    }

    return this.dom.insertHTMLBefore(<HTMLElement>this.element, nextSibling, html);
  }

  newNode(node) {
    if (!this.firstNode) this.firstNode = node;
    this.lastNode = node;
  }
}

interface Operations {
  appendText(text: string): Text;
  appendComment(value: string): Comment;
  openElement(tag: string): Element;
  insertHTMLBefore(nextSibling: Node, html: string): { first: Node, last: Node };
  closeElement();
}

class TopLevelOperations implements Operations {
  private stack: ElementStack;
  private nested: NestedOperations;

  constructor(stack) {
    this.stack = stack;
    this.nested = null;
  }

  appendText(text): Text {
    let node = this.stack._appendText(text);
    return this._newNode(node);
  }

  appendComment(value): Comment {
    let node = this.stack._appendComment(value);
    return this._newNode(node);
  }

  openElement(tag): Element {
    let element = this.stack._openElement(tag);
    this._newNode(element);

    let nestedOperations = this.nested = this.nested || new NestedOperations(this.stack, this);
    this.stack.operations = nestedOperations;

    return element;
  }

  insertHTMLBefore(nextSibling: Node, html: string) {
    let bounds = this.stack._insertHTMLBefore(nextSibling, html);
    let { stack } = this;
    if (!stack.firstNode) stack.firstNode = bounds.first;
    stack.lastNode = bounds.last;
    return bounds;
  }

  _newNode<T extends Node>(node: T): T {
    let stack = this.stack;
    if (!stack.firstNode) stack.firstNode = node;
    stack.lastNode = node;
    return node;
  }

  closeElement() {
    throw new Error("BUG: Unbalanced open and close element");
  }
}

class NestedOperations implements Operations {
  private level: number;
  private stack: ElementStack;
  private topLevel: TopLevelOperations;

  constructor(stack, topLevel) {
    this.level = 1;
    this.stack = stack;
    this.topLevel = topLevel;
  }

  appendText(text): Text {
    return this.stack._appendText(text);
  }

  appendComment(value): Comment {
    return this.stack._appendComment(value);
  }

  openElement(tag): Element {
    this.level++;
    return this.stack._openElement(tag);
  }

  insertHTMLBefore(nextSibling: Node, html: string) {
    return this.stack._insertHTMLBefore(nextSibling, html);
  }

  closeElement() {
    this.stack._closeElement();

    if (this.level === 1) {
      this.stack.operations = this.topLevel;
    } else {
      this.level--;
    }
  }
}
