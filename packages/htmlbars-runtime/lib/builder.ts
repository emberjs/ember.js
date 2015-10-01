import {
  Bounds,
  ConcreteBounds,
  Morph,
  ContentMorph,
  MorphSpecializer,
  createMorph
} from './morph';
import { Frame } from './environment';
import DOMHelper from './dom';
import { StatementSyntax } from './template'
import { InternedString } from 'htmlbars-util';

// Builders are created for each template the first time it is rendered.
// The builder walks through all statements, static and dynamic, and
// returns a result containing just the static statements with the
// dynamic morphs created for the statements. Subsequent rerenders
// can simply walk over the statements and apply them to the morphs.
export default class Builder {
  private frame: Frame;
  private parentMorph: ContentMorph;
  private stack: ElementStack;
  private morphs: Morph[];

  constructor(morph: ContentMorph, nextSibling: Node) {
    let frame = this.frame = morph.frame;

    this.parentMorph = morph;
    this.stack = new ElementStack({ builder: this, frame, morph, nextSibling });
    this.morphs = [];
  }

  morphList(): Morph[] {
    return this.morphs;
  }

  bounds(): Bounds {
    return this.stack.bounds();
  }

  /// Interaction with ElementStack

  createMorph<M extends Morph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions, parentElement: Element): M {
    let morph = createMorph(Type, parentElement, this.frame, attrs);
    this.morphs.push(morph);
    return morph;
  }

  /// Utilities

  render(statement: StatementSyntax) {
    let { stack, frame } = this;
    let refinedStatement = this.frame.syntax(statement);

    if (refinedStatement.isStatic) {
      refinedStatement.evaluate(stack, frame);
      return;
    }

    let content = refinedStatement.evaluate(stack, frame);
    content.append(stack);
  }
}

interface FirstNode {
  firstNode(): Node;
}

interface LastNode {
  lastNode(): Node;
}

class First {
  private node: Node;

  constructor(node) {
    this.node = node;
  }

  firstNode(): Node {
    return this.node;
  }
}

class Last {
  private node: Node;

  constructor(node) {
    this.node = node;
  }

  lastNode(): Node {
    return this.node;
  }
}

export class ElementBuffer {
  protected morph: ContentMorph;
  protected nextSibling: Node;
  protected dom: DOMHelper;
  protected element: Element;

  constructor({ morph, nextSibling }: { morph: ContentMorph, nextSibling: Node }) {
    this.dom = morph.frame.dom();
    this.element = morph.parentNode;
    this.morph = morph;
    this.nextSibling = nextSibling;
  }

  _appendText(string: string): Text {
    let { dom } = this;
    let text = dom.createTextNode(string);
    dom.insertBefore(this.element, text, this.nextSibling);
    return text;
  }

  appendText(string: string): Text {
    return this._appendText(string);
  }

  _appendComment(string: string): Comment {
    let { dom } = this;
    let comment = dom.createComment(string);
    dom.insertBefore(this.element, comment, this.nextSibling);
    return comment;
  }

  appendComment(string: string): Comment {
    return this._appendComment(string);
  }

  _insertHTMLBefore(nextSibling: Node, html: string): Bounds {
    if (!(this.element instanceof HTMLElement)) {
      throw new Error(`You cannot insert HTML (using triple-curlies or htmlSafe) into an SVG context: ${this.element.tagName}`)
    }

    return this.dom.insertHTMLBefore(<HTMLElement & Element>this.element, nextSibling, html);
  }

  insertHTMLBefore(nextSibling: Node, html: string): Bounds {
    return this._insertHTMLBefore(nextSibling, html);
  }

  _setAttribute(name: InternedString, value: any) {
    this.dom.setAttribute(<HTMLElement & Element>this.element, name, value);
  }

  setAttribute(name: InternedString, value: any) {
    this._setAttribute(name, value);
  }

  _setAttributeNS(name: InternedString, value: any, namespace: InternedString) {
    this.dom.setAttributeNS(this.element, name, value, namespace);
  }

  setAttributeNS(name: InternedString, value: any, namespace: InternedString) {
    this._setAttributeNS(name, value, namespace);
  }
}

export class ElementStack extends ElementBuffer {
  private builder: Builder;
  private frame: Frame;
  private elementStack: Element[];
  private nextSiblingStack: Node[];
  public firstNode: FirstNode;
  public lastNode: Node | Bounds;
  public operations: Operations;

  constructor({ builder, frame, morph, nextSibling }: { builder: Builder, frame: Frame, morph: ContentMorph, nextSibling: Node }) {
    super({ morph, nextSibling });
    this.builder = builder;
    this.frame = frame;
    this.dom = frame.dom();
    this.morph = morph;
    this.operations = new TopLevelOperations(this);
    this.element = morph.parentNode;
    this.nextSibling = nextSibling;
    this.elementStack = [morph.parentNode];
    this.nextSiblingStack = [nextSibling];

    this.firstNode = null;
    this.lastNode = null;
  }

  bounds(): Bounds {
    let lastNode = this.lastNode instanceof Node ?
      new Last(this.lastNode) : <Bounds>this.lastNode;

    return {
      firstNode: () => this.firstNode.firstNode(),
      lastNode: () => lastNode.lastNode(),
      parentElement: () => this.element
    };
  }

  _pushElement(element) {
    this.elementStack.push(element);
    this.nextSiblingStack.push(null);
    this.element = element;
    this.nextSibling = null;
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

  createMorph<M extends Morph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions): M {
    return this.builder.createMorph(Type, attrs, this.element);
  }

  createContentMorph<M extends ContentMorph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions): M {
    return this.operations.createContentMorph(Type, attrs);
  }

  appendMorph<M extends Morph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions) {
    this.createMorph(Type, attrs).append(this);
  }

  setAttribute(name, value) {
    this.dom.setAttribute(<HTMLElement & Element>this.element, name, value);
  }

  setAttributeNS(name, value, namespace) {
    this.dom.setAttributeNS(this.element, name, value, namespace);
  }

  appendText(text): Text {
    return this.operations.appendText(text);
  }

  appendComment(comment): Comment {
    return this.operations.appendComment(comment);
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
    return this.operations.insertHTMLBefore(nextSibling, html);
  }

  newNode<T extends Node>(node: T): T {
    if (!this.firstNode) this.firstNode = new First(node);
    this.lastNode = node;
    return node;
  }

  newContentMorph(morph: ContentMorph) {
    if (!this.firstNode) this.firstNode = morph;
    this.lastNode = morph;
    return morph;
  }
}

interface Operations {
  appendText(text: string): Text;
  appendComment(value: string): Comment;
  openElement(tag: string): Element;
  insertHTMLBefore(nextSibling: Node, html: string): Bounds;
  createContentMorph<M extends ContentMorph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions): M;
  closeElement();
}

class TopLevelOperations implements Operations {
  private stack: ElementStack;
  private nested: NestedOperations;

  constructor(stack) {
    this.stack = stack;
    this.nested = null;
  }

  appendText(text: string): Text {
    let node = this.stack._appendText(text);
    return this.stack.newNode(node);
  }

  appendComment(value: string): Comment {
    let node = this.stack._appendComment(value);
    return this.stack.newNode(node);
  }

  openElement(tag: string): Element {
    let element = this.stack._openElement(tag);
    this.stack.newNode(element);

    let nestedOperations = this.nested = this.nested || new NestedOperations(this.stack, this);
    this.stack.operations = nestedOperations;

    return element;
  }

  insertHTMLBefore(nextSibling: Node, html: string) {
    let bounds = this.stack._insertHTMLBefore(nextSibling, html);
    let { stack } = this;
    stack.newNode(bounds.firstNode());
    stack.newNode(bounds.lastNode());
    return bounds;
  }

  createContentMorph<M extends ContentMorph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions): M {
    let morph = this.stack.createMorph(Type, attrs);
    this.stack.newContentMorph(morph);
    return morph;
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

  createContentMorph<M extends ContentMorph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions): M {
    return this.stack.createMorph(Type, attrs);
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
