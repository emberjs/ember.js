import {
  Bounds,
  ConcreteBounds,
  Morph,
  ContentMorph,
  MorphSpecializer,
  BlockInvocationMorph,
  createMorph
} from './morph';
import { Frame, Block } from './environment';
import DOMHelper from './dom';
import { DynamicStatementSyntax, StaticStatementSyntax, StatementSyntax } from './template'
import { InternedString } from 'htmlbars-util';

export function renderStatement(statement: StatementSyntax, stack: ElementStack, frame: Frame) {
  let refinedStatement = frame.syntax(statement);

  if (refinedStatement.isStatic) {
    (<StaticStatementSyntax>refinedStatement).evaluate(stack);
    return;
  }

  let content = (<DynamicStatementSyntax>refinedStatement).evaluate(stack, frame);
  content.append(stack);
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

interface ElementBufferOptions {
  parentNode: Element;
  nextSibling: Node;
  dom: DOMHelper;
}

export class ElementBuffer {
  protected nextSibling: Node;
  protected dom: DOMHelper;
  public element: Element;

  constructor({ parentNode, nextSibling, dom }: ElementBufferOptions) {
    this.dom = dom;
    this.element = parentNode;
    this.nextSibling = nextSibling;
  }

  createMorph<M extends Morph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions, frame: Frame): M {
    return createMorph(Type, this.element, frame, attrs);
  }

  appendText(string: string): Text {
    let { dom } = this;
    let text = dom.createTextNode(string);
    dom.insertBefore(this.element, text, this.nextSibling);
    return text;
  }

  appendComment(string: string): Comment {
    let { dom } = this;
    let comment = dom.createComment(string);
    dom.insertBefore(this.element, comment, this.nextSibling);
    return comment;
  }

  insertHTMLBefore(nextSibling: Node, html: string): Bounds {
    if (!(this.element instanceof HTMLElement)) {
      throw new Error(`You cannot insert HTML (using triple-curlies or htmlSafe) into an SVG context: ${this.element.tagName}`)
    }

    return this.dom.insertHTMLBefore(<HTMLElement & Element>this.element, nextSibling, html);
  }

  setAttribute(name: InternedString, value: any) {
    this.dom.setAttribute(<HTMLElement & Element>this.element, name, value);
  }

  setAttributeNS(name: InternedString, value: any, namespace: InternedString) {
    this.dom.setAttributeNS(this.element, name, value, namespace);
  }
}

interface ElementStackClass<T extends ElementStack> {
  new (options: ElementBufferOptions): T;
}

export class ElementStack extends ElementBuffer {
  private elementStack: Element[];
  private nextSiblingStack: Node[];
  private morphs: Morph[];
  public operations: Operations = null;

  constructor(options: ElementBufferOptions) {
    super(options);
    this.elementStack = [this.element];
    this.nextSiblingStack = [this.nextSibling];
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

  appendStatement(statement: StatementSyntax, frame: Frame) {
    let refinedStatement = frame.syntax(statement);

    if (refinedStatement.isStatic) {
      refinedStatement.evaluate(this, frame);
      return;
    }

    let content = refinedStatement.evaluate(this, frame);
    content.append(this);
  }

  createMorph<M extends Morph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions, frame: Frame): M {
    this.operations.willCreateMorph(<typeof Morph>Type, attrs);
    let morph = super.createMorph(Type, attrs, frame);
    this.operations.didCreateMorph(morph);
    return morph;
  }

  createContentMorph<M extends ContentMorph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions, frame: Frame): M {
    this.operations.willCreateContentMorph(<typeof ContentMorph>Type, attrs);
    let morph = this.createMorph(Type, attrs, frame);
    this.operations.didCreateContentMorph(morph);
    return morph;
  }

  createBlockMorph(block: Block, frame: Frame) {
    return this.createContentMorph(BlockInvocationMorph, { block }, frame);
  }

  appendText(text: string): Text {
    this.operations.willAppendText(text);
    let textNode = super.appendText(text);
    this.operations.didAppendText(textNode);
    return textNode;
  }

  appendComment(comment: string): Comment {
    this.operations.willAppendComment(comment);
    let commentNode = super.appendComment(comment);
    this.operations.didAppendComment(commentNode);
    return commentNode;
  }

  openElement(tag: string): Element {
    this.operations.willOpenElement(tag);
    let element = this.dom.createElement(tag, this.element);
    this._pushElement(element);
    this.operations.didOpenElement(element);
    return element;
  }

  closeElement() {
    this.operations.willCloseElement();
    let child = this._popElement();
    this.dom.insertBefore(this.element, child, this.nextSibling);
    this.operations.didCloseElement();
  }

  appendHTML(html: string): Bounds {
    this.operations.willAppendHTML(html);
    let bounds = this.dom.insertHTMLBefore(<HTMLElement>this.element, this.nextSibling, html);
    this.operations.didAppendHTML(bounds);
    return bounds;
  }
}

export interface Operations {
  willAppendText(text: string);
  didAppendText(text: Text);
  willAppendComment(value: string);
  didAppendComment(value: Comment);
  willOpenElement(tag: string);
  didOpenElement(element: Element);
  willAppendHTML(html: string);
  didAppendHTML(bounds: Bounds);
  willCreateMorph(Type: typeof Morph, attrs: Object);
  didCreateMorph(morph: Morph);
  willCreateContentMorph(Type: typeof ContentMorph, attrs: Object);
  didCreateContentMorph(morph: ContentMorph);
  willCloseElement();
  didCloseElement();
}

export class NullOperations implements Operations {
  protected stack: ElementStack;

  constructor(stack: ElementStack) {
    this.stack = stack;
  }

  willAppendText(text: string) {}
  didAppendText(text: Text) {}
  willAppendComment(value: string) {}
  didAppendComment(value: Comment) {}
  willOpenElement(tag: string) {}
  didOpenElement(element: Element) {}
  willAppendHTML(html: string) {}
  didAppendHTML(bounds: Bounds) {}
  willCreateMorph(Type: typeof Morph, attrs: Object) {}
  didCreateMorph(morph: Morph) {}
  willCreateContentMorph(Type: typeof ContentMorph, attrs: Object) {}
  didCreateContentMorph(morph: ContentMorph) {}
  willCloseElement() {}
  didCloseElement() {}
}

const NULL_OPERATIONS = new NullOperations(null);


interface DelegatingOperationsClass<T extends DelegatingOperations> {
  new (target: Operations): T
}

export function wrap<T extends DelegatingOperations>(stack: ElementStack, Operations: DelegatingOperationsClass<T>, callback: (T) => void): T {
  let oldOperations = stack.operations;
  let operations = stack.operations = new Operations(oldOperations || NULL_OPERATIONS);

  callback(operations);
  stack.operations = oldOperations;
  return operations;
}

export abstract class DelegatingOperations implements Operations {
  protected target: Operations;

  constructor(target: Operations) {
    this.target = target;
  }

  init(options: Object) {}

  willAppendText(text: string) {
    this.target.willAppendText(text);
  }

  didAppendText(text: Text) {
    this.target.didAppendText(text);
  }

  willAppendComment(value: string) {
    this.target.willAppendComment(value);
  }

  didAppendComment(value: Comment) {
    this.target.didAppendComment(value);
  }

  willOpenElement(tag: string) {
    this.target.willOpenElement(tag);
  }

  didOpenElement(element: Element) {
    this.target.didOpenElement(element);
  }

  willAppendHTML(html: string) {
    this.target.willAppendHTML(html);
  }

  didAppendHTML(bounds: Bounds) {
    this.target.didAppendHTML(bounds);
  }

  willCreateMorph(Type: typeof Morph, attrs: Object) {
    this.target.willCreateMorph(Type, attrs);
  }

  didCreateMorph(morph: Morph) {
    this.target.didCreateMorph(morph);
  }

  willCreateContentMorph(Type: typeof ContentMorph, attrs: Object) {
    this.target.willCreateContentMorph(Type, attrs);
  }

  didCreateContentMorph<M extends ContentMorph>(morph: M) {
    this.target.didCreateContentMorph(morph);
  }

  willCloseElement() {
    this.target.willCloseElement();
  }

  didCloseElement() {
    this.target.didCloseElement();
  }
}

export class TopLevelOperations extends DelegatingOperations {
  private stack: ElementStack;
  private element: Element;
  public trackedFirstNode: FirstNode;
  public trackedLastNode: Node | Bounds;
  private nested: NestedOperations = null;
  private morphs: Morph[] = [];

  init({ stack }: { stack: ElementStack }) {
    this.stack = stack;
    this.element = stack.element;
  }

  bounds(): Bounds {
    let element = this.element;
    let first = this.trackedFirstNode;
    let last;

    if (this.trackedLastNode instanceof Node) last = new Last(this.trackedLastNode);
    else last = <Bounds>this.trackedLastNode;

    return {
      parentElement() { return element; },
      firstNode() { return first.firstNode(); },
      lastNode() { return last.lastNode(); }
    };
  }

  firstNode(): Node {
    return this.trackedFirstNode.firstNode();
  }

  lastNode(): Node {
    if (this.trackedLastNode instanceof Node) return <Node>this.trackedLastNode;
    return (<Bounds>this.trackedLastNode).lastNode();
  }

  morphList(): Morph[] {
    return this.morphs;
  }

  newNode<T extends Node>(node: T) {
    if (!this.trackedFirstNode) this.trackedFirstNode = new First(node);
    this.trackedLastNode = node;
    return node;
  }

  didAppendText(text: Text) {
    super.didAppendText(text);
    return this.newNode(text);
  }

  didAppendComment(comment: Comment) {
    super.didAppendComment(comment);
    return this.newNode(comment);
  }

  didOpenElement(element: Element) {
    super.didOpenElement(element);
    this.newNode(element);

    let nestedOperations = this.nested = this.nested || new NestedOperations(this.stack);
    this.stack.operations = nestedOperations;
  }

  didAppendHTML(bounds: Bounds) {
    super.didAppendHTML(bounds);
    this.newNode(bounds.firstNode());
    this.newNode(bounds.lastNode());
  }

  didCreateContentMorph<M extends ContentMorph, InitOptions>(morph: ContentMorph) {
    super.didCreateContentMorph(morph);
    if (!this.trackedFirstNode) this.trackedFirstNode = morph;
    this.trackedLastNode = morph;
  }

  didCreateMorph(morph: Morph) {
    super.didCreateMorph(morph);
    this.morphs.push(morph);
  }

  didCloseElement() {
    throw new Error("BUG: Unbalanced open and close element");
  }
}

class NestedOperations extends NullOperations {
  private level: number;
  private parent: Operations;

  constructor(stack) {
    super(stack);
    this.level = 1;
    this.parent = stack.operations;
  }

  willOpenElement() {
    this.level++;
  }

  didCreateMorph(morph: Morph) {
    this.parent.didCreateMorph(morph);
  }

  didCloseElement() {
    if (this.level === 1) {
      this.stack.operations = this.parent;
    } else {
      this.level--;
    }
  }
}
