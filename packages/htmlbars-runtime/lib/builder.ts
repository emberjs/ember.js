import {
  Bounds,
  ConcreteBounds,
  Morph,
  ContentMorph,
  MorphSpecializer,
  BlockInvocationMorph,
  createMorph
} from './morph';

import {
  ComponentDefinition,
  ComponentDefinitionOptions,
  AppendingComponent
} from './component/interfaces';

import { Frame, Block } from './environment';
import DOMHelper from './dom';
import {
  DynamicStatementSyntax,
  StaticStatementSyntax,
  StatementSyntax,
  EvaluatedParams,
  AttributeSyntax,
  TemplateEvaluation,
  Templates,
  Hash,
  ATTRIBUTE_SYNTAX
} from './template'
import { InternedString, Dict, intern, dict } from 'htmlbars-util';
import { RootReference, ChainableReference, NotifiableReference, PushPullReference, Destroyable } from 'htmlbars-reference';

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

export class ClassList extends PushPullReference {
  private list: ChainableReference[] = [];

  append(reference: ChainableReference) {
    this.list.push(reference);
    this._addSource(reference);
  }

  value(): string {
    if (this.list.length === 0) return null;
    return this.list.map(i => i.value()).join(' ');
  }
}

export class ElementBuffer {
  public nextSibling: Node;
  public dom: DOMHelper;
  public element: Element;

  constructor({ parentNode, nextSibling, dom }: ElementBufferOptions) {
    this.dom = dom;
    this.element = parentNode;
    this.nextSibling = nextSibling;
    if (nextSibling && !(nextSibling instanceof Node)) throw new Error("NOPE");
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
  public operations: Operations;
  public topLevelHandlers: Handler[] = [];
  public handlers: Handler[] = [];
  private classListStack: ClassList[] = [];
  private classList: ClassList = null;

  constructor(options: ElementBufferOptions) {
    super(options);
    this.operations = new TopLevelOperations(this, this.topLevelHandlers);
    this.elementStack = [this.element];
    this.nextSiblingStack = [this.nextSibling];
  }

  _pushElement(element) {
    this.elementStack.push(element);
    this.classListStack.push(null);
    this.nextSiblingStack.push(null);
    this.element = element;
    this.classList = null;
    this.nextSibling = null;
  }

  _popElement() {
    let { elementStack, nextSiblingStack, classListStack }  = this;
    let topElement = elementStack.pop();

    nextSiblingStack.pop();
    classListStack.pop();

    this.element = elementStack[elementStack.length - 1];
    this.nextSibling = nextSiblingStack[nextSiblingStack.length - 1];
    this.classList = classListStack[classListStack.length - 1];

    return topElement;
  }

  bounds() {
    return (<TopLevelOperations>this.operations).bounds();
  }

  morphList() {
    return (<TopLevelOperations>this.operations).morphList();
  }

  addTopLevelHandler(handler: Handler) {
    handler.stack = this;
    this.topLevelHandlers.push(handler);
  }

  addTemplateHandler(handler: Handler) {
    handler.stack = this;
    this.topLevelHandlers.push(handler);
    this.handlers.push(handler);
  }

  appendStatement(statement: StatementSyntax, frame: Frame, evaluation: TemplateEvaluation) {
    this.operations.appendStatement(statement, frame, evaluation);
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

  createBlockMorph(block: Block, frame: Frame, blockArguments: EvaluatedParams): BlockInvocationMorph {
    return <BlockInvocationMorph>this.createContentMorph(BlockInvocationMorph, { block, blockArguments }, frame);
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

  openComponent(definition: ComponentDefinition, { tag, frame, templates, hash }: ComponentDefinitionOptions) {
    let appending = definition.begin(this, { frame, templates, hash, tag });
    this.operations.didOpenComponent(tag, appending);
    let morph = appending.process();
    this.operations.didCreateMorph(morph);
    this.operations.didCreateContentMorph(morph);
    morph.append(this);
  }

  setAttribute(name: InternedString, value: any) {
    if (!(this.operations instanceof NestedOperations)) throw new Error("WUT");
    this.dom.setAttribute(<HTMLElement & Element>this.element, name, value);
  }

  addClass(ref: ChainableReference) {
    let classList = this.classList;
    if (!classList) {
      classList = this.classList = new ClassList();
      this.classListStack[this.classListStack.length - 1] = classList;
    }

    classList.append(ref);
  }

  closeElement(): { element: Element, classList: ClassList } {
    let { element, classList } = this;
    this.operations.willCloseElement();
    this.operations.closeElement();
    this.operations.didCloseElement();
    return { element, classList };
  }

  appendHTML(html: string): Bounds {
    this.operations.willAppendHTML(html);
    let bounds = this.dom.insertHTMLBefore(<HTMLElement>this.element, this.nextSibling, html);
    this.operations.didAppendHTML(bounds);
    return bounds;
  }
}

export interface Handler {
  stack: ElementStack;

  willAppendText(text: string);
  didAppendText(text: Text);
  willAppendComment(value: string);
  didAppendComment(value: Comment);
  willOpenElement(tag: string);
  didOpenElement(element: Element);
  didOpenComponent(tag: string, component: AppendingComponent);
  willAppendHTML(html: string);
  didAppendHTML(bounds: Bounds);
  willCreateMorph(Type: typeof Morph, attrs: Object);
  didCreateMorph(morph: Morph);
  willCreateContentMorph(Type: typeof ContentMorph, attrs: Object);
  didCreateContentMorph(morph: ContentMorph);
  willCloseElement();
  didCloseElement();
}

export class NullHandler implements Handler {
  public stack: ElementStack = null;

  willAppendText(text: string) {}
  didAppendText(text: Text) {}
  willAppendComment(value: string) {}
  didAppendComment(value: Comment) {}
  willOpenElement(tag: string) {}
  didOpenElement(element: Element) {}
  didOpenComponent(tag: string, component: AppendingComponent) {}
  willAppendHTML(html: string) {}
  didAppendHTML(bounds: Bounds) {}
  willCreateMorph(Type: typeof Morph, attrs: Object) {}
  didCreateMorph(morph: Morph) {}
  willCreateContentMorph(Type: typeof ContentMorph, attrs: Object) {}
  didCreateContentMorph(morph: ContentMorph) {}
  willCloseElement() {}

  didCloseElement() {
    throw new Error("BUG: Unbalanced open and close element");
  }
}

function eachHandler(handlers: Handler[], callback: (handler: Handler) => void) {
  for (let i=0, l=handlers.length; i<l; i++) {
    callback(handlers[i]);
  }
}

interface Operations extends Handler {
  didCreateContentMorph<M extends ContentMorph, InitOptions>(morph: ContentMorph);
  didCreateMorph(morph: Morph);
  closeElement();
  appendStatement(statement: StatementSyntax, frame: Frame, evaluation: TemplateEvaluation);
}

export class DelegatingOperations implements Operations {
  protected handlers: Handler[];
  public stack: ElementStack;

  constructor(stack: ElementStack, handlers: Handler[]) {
    this.stack = stack;
    this.handlers = handlers;
  }

  appendStatement(statement: StatementSyntax, frame: Frame, evaluation: TemplateEvaluation) {
    let refinedStatement = frame.syntax(statement);

    if (refinedStatement.isStatic) {
      refinedStatement.evaluate(this.stack, frame, evaluation);
      return;
    }

    let content = refinedStatement.evaluate(this.stack, frame, evaluation);
    if (content) content.append(this.stack, evaluation);
  }

  closeElement() {
    let stack = this.stack;
    let child = stack._popElement();
    stack.dom.insertBefore(stack.element, child, stack.nextSibling);
  }

  willAppendText(text: string) {
    eachHandler(this.handlers, handler => handler.willAppendText(text));
  }

  didAppendText(text: Text) {
    eachHandler(this.handlers, handler => handler.didAppendText(text));
  }

  willAppendComment(value: string) {
    eachHandler(this.handlers, handler => handler.willAppendComment(value));
  }

  didAppendComment(value: Comment) {
    eachHandler(this.handlers, handler => handler.didAppendComment(value));
  }

  willOpenElement(tag: string) {
    eachHandler(this.handlers, handler => handler.willOpenElement(tag));
  }

  didOpenElement(element: Element) {
    eachHandler(this.handlers, handler => handler.didOpenElement(element));
  }

  didOpenComponent(tag: string, component: AppendingComponent) {
    eachHandler(this.handlers, handler => handler.didOpenComponent(tag, component));
  }

  willAppendHTML(html: string) {
    eachHandler(this.handlers, handler => handler.willAppendHTML(html));
  }

  didAppendHTML(bounds: Bounds) {
    eachHandler(this.handlers, handler => handler.didAppendHTML(bounds));
  }

  willCreateMorph(Type: typeof Morph, attrs: Object) {
    eachHandler(this.handlers, handler => handler.willCreateMorph(Type, attrs));
  }

  didCreateMorph(morph: Morph) {
    eachHandler(this.handlers, handler => handler.didCreateMorph(morph));
  }

  willCreateContentMorph(Type: typeof ContentMorph, attrs: Object) {
    eachHandler(this.handlers, handler => handler.willCreateContentMorph(Type, attrs));
  }

  didCreateContentMorph(morph: ContentMorph) {
    eachHandler(this.handlers, handler => handler.didCreateContentMorph(morph));
  }

  willCloseElement() {
    eachHandler(this.handlers, handler => handler.willCloseElement());
  }

  didCloseElement() {
    eachHandler(this.handlers, handler => handler.didCloseElement());
  }
}

export class TopLevelOperations extends DelegatingOperations {
  private element: Element;
  public trackedFirstNode: FirstNode;
  public trackedLastNode: Node | Bounds;
  private morphs: Morph[] = [];

  constructor(stack: ElementStack, handlers: Handler[]) {
    super(stack, handlers);
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
    this.stack.operations = new NestedOperations(this.stack, this.stack.handlers);
  }

  didOpenComponent(tag: string, component: AppendingComponent) {
    super.didOpenComponent(tag, component);
    this.stack.operations = new ComponentOperations(this.stack, component, this);
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

export class ComponentOperations extends DelegatingOperations {
  private parent: Operations;
  private appending: AppendingComponent;
  private attrs: AttributeSyntax[] = [];

  constructor(stack: ElementStack, appending: AppendingComponent, parent: DelegatingOperations) {
    super(stack, [parent]);
    this.stack = stack;
    this.appending = appending;
    this.parent = parent;
  }

  closeElement() {}

  didOpenElement(element: Element) {
    this.stack.operations = new NestedOperations(this.stack, this.stack.handlers);
  }

  didOpenComponent(tag: string, component: AppendingComponent) {
    this.stack.operations = new ComponentOperations(this.stack, component, this);
  }

  didCloseElement() {
    let { appending, parent, stack } = this;
    stack.operations = parent;
  }
}

export class NestedOperations extends DelegatingOperations {
  private level: number;
  private parent: Operations;

  constructor(stack: ElementStack, handlers: Handler[]) {
    super(stack, handlers);
    this.parent = stack.operations;
    this.level = 1;
  }

  willOpenElement() {
    this.level++;
  }

  didCreateMorph(morph: Morph) {
    this.parent.didCreateMorph(morph);
  }

  didOpenComponent(tag: string, component: AppendingComponent) {
    super.didOpenComponent(tag, component);
    this.stack.operations = new ComponentOperations(this.stack, component, this);
  }

  didCloseElement() {
    if (this.level === 1) {
      this.stack.operations = this.parent;
    } else {
      this.level--;
    }
  }
}