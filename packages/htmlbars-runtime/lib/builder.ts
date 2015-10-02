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
import DOMHelper, { isWhitespace } from './dom';
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
  private operations: TopLevelOperations;
  private morphs: Morph[];

  constructor(morph: ContentMorph, nextSibling: Node) {
    let frame = this.frame = morph.frame;

    this.parentMorph = morph;
    let stack = this.stack = new ElementStack({ builder: this, frame, morph, nextSibling });
    let operations = this.operations = new TopLevelOperations(null, stack);
    stack.operations = operations;
    this.morphs = [];
  }

  chainTopLevelOperations() {
    let operations = new TopLevelOperations(this.stack.operations, this.stack);
  }

  morphList(): Morph[] {
    return this.morphs;
  }

  bounds(): Bounds {
    return {
      parentElement: () => this.parentMorph.parentElement(),
      firstNode: () => this.operations.firstNode(),
      lastNode: () => this.operations.lastNode()
    };
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

interface ElementStackOptions {
  builder: Builder;
  frame: Frame;
  morph: ContentMorph;
  nextSibling: Node;
}

interface ElementStackClass<T extends ElementStack> {
  new (options: ElementStackOptions): T;
}

export class ElementStack extends ElementBuffer {
  private builder: Builder;
  private frame: Frame;
  private elementStack: Element[];
  private nextSiblingStack: Node[];
  public operations: Operations = null;

  constructor({ builder, frame, morph, nextSibling }: ElementStackOptions) {
    super({ morph, nextSibling });
    this.builder = builder;
    this.frame = frame;
    this.dom = frame.dom();
    this.morph = morph;
    this.element = morph.parentNode;
    this.nextSibling = nextSibling;
    this.elementStack = [morph.parentNode];
    this.nextSiblingStack = [nextSibling];
  }

  refine<T extends Operations>(operations: T, callback: () => void) {
    let oldOperations = this.operations;
    this.operations = operations;
    callback();
    this.operations = oldOperations;
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
    this.operations.willCreateContentMorph(Type, attrs);
    let morph = this.createMorph(Type, attrs);
    this.operations.didCreateContentMorph(morph);
    return morph;
  }

  createBlockMorph(block: Block) {
    return this.createContentMorph(BlockInvocationMorph, { block });
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

  appendText(text: string): Text {
    this.operations.willAppendText(text);
    let textNode = this.dom.createTextNode(text);
    this.dom.insertBefore(this.element, textNode, this.nextSibling);
    this.operations.didAppendText(textNode);
    return textNode;
  }

  appendComment(comment: string): Comment {
    this.operations.willAppendComment(comment);
    let commentNode = this.dom.createComment(comment);
    this.dom.insertBefore(this.element, commentNode, this.nextSibling);
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

interface Operations {
  willAppendText(text: string);
  didAppendText(text: Text);
  willAppendComment(value: string);
  didAppendComment(value: Comment);
  willOpenElement(tag: string);
  didOpenElement(element: Element);
  willAppendHTML(html: string);
  didAppendHTML(bounds: Bounds);
  willCreateContentMorph<M extends ContentMorph>(Type: MorphSpecializer<M, Object>, attrs: Object);
  didCreateContentMorph<M extends ContentMorph>(morph: M);
  willCloseElement();
  didCloseElement();
}

class DefaultOperations implements Operations {
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
  willCreateContentMorph<M extends ContentMorph>(Type: MorphSpecializer<M, Object>, attrs: Object) {}
  didCreateContentMorph<M extends ContentMorph>(morph: M) {}
  willCloseElement() {}
  didCloseElement() {}
}

const NULL_OPERATIONS = new DefaultOperations(null);

abstract class DelegatingOperations implements Operations {
  protected target: Operations;

  constructor(target: Operations) {
    this.target = target;
  }

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

  willCreateContentMorph<M extends ContentMorph>(Type: MorphSpecializer<M, Object>, attrs: Object) {
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

class TopLevelOperations extends DelegatingOperations {
  private nested: NestedOperations;
  private stack: ElementStack;
  public trackedFirstNode: FirstNode;
  public trackedLastNode: Node | Bounds;

  constructor(target: Operations, stack: ElementStack) {
    super(target || NULL_OPERATIONS);
    this.stack = stack;
    this.nested = null;
  }

  firstNode(): Node {
    return this.trackedFirstNode.firstNode();
  }

  lastNode(): Node {
    if (this.trackedLastNode instanceof Node) return <Node>this.trackedLastNode;
    return (<Bounds>this.trackedLastNode).lastNode();
  }

  newNode<T extends Node>(node: T) {
    if (!this.trackedFirstNode) this.trackedFirstNode = new First(node);
    this.trackedLastNode = node;
    return node;
  }

  newContentMorph(morph: ContentMorph) {
    if (!this.trackedFirstNode) this.trackedFirstNode = morph;
    this.trackedLastNode = morph;
    return morph;
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
    this.newContentMorph(morph);
  }

  didCloseElement() {
    throw new Error("BUG: Unbalanced open and close element");
  }
}

export class ComponentOperations extends DelegatingOperations {
  public rootElement: Element = null;

  willOpenElement(tag: string) {
    if (this.rootElement) throw new Error("You cannot create multiple root elements in a component's layout");
    super.willOpenElement(tag);
  }

  didOpenElement(element: Element) {
    this.rootElement = element;
    super.didOpenElement(element);
  }

  willAppendText(text: string) {
    if (!isWhitespace(text)) throw new Error("You cannot have non-whitespace text at the root of a component's layout");
    super.willAppendText(text);
  }

  willCreateContentMorph<M extends ContentMorph>(Type: MorphSpecializer<M, Object>, attrs: Object) {
    throw new Error("You cannot have curlies (`{{}}`) at the root of a component's layout")
    super.willCreateContentMorph(Type, attrs);
  }
}

class NestedOperations extends DefaultOperations {
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

  didCloseElement() {
    if (this.level === 1) {
      this.stack.operations = this.parent;
    } else {
      this.level--;
    }
  }
}
