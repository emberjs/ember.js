import {
  Bounds,
  ConcreteBounds,
  Morph,
  ContentMorph,
  TemplateMorph,
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
import Template, {
  EvaluatedParams,
  AttributeSyntax,
  TemplateEvaluation,
  Templates,
  Hash,
  ATTRIBUTE_SYNTAX
} from './template'
import { RenderResult } from './render';
import { InternedString, Dict, intern, dict } from 'htmlbars-util';
import { RootReference, ChainableReference, NotifiableReference, PushPullReference, Destroyable } from 'htmlbars-reference';

import {
  DynamicStatementSyntax,
  StaticStatementSyntax,
  StatementSyntax
} from './opcodes'

import { VM } from './vm';

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

interface ElementStackOptions {
  parentNode: Element;
  nextSibling: Node;
  dom: DOMHelper;
}

interface ElementStackClass<T extends ElementStack> {
  new (options: ElementStackOptions): T;
}

class BlockStackElement {
  public morphList: Morph[] = null;
  public firstNode: Node = null;
  public lastNode: Node = null;
}

export class ElementStack {
  public nextSibling: Node;
  public dom: DOMHelper;
  public element: Element;

  private elementStack: Element[];
  private nextSiblingStack: Node[];
  private morphs: Morph[];
  private classListStack: ClassList[] = [];
  private classList: ClassList = null;
  private blockStack: BlockTracker[];
  private blockElement: BlockTracker;

  constructor({ dom, parentNode, nextSibling }: ElementStackOptions) {
    this.dom = dom;
    this.element = parentNode;
    this.nextSibling = nextSibling;
    if (nextSibling && !(nextSibling instanceof Node)) throw new Error("NOPE");

    this.elementStack = [this.element];
    this.nextSiblingStack = [this.nextSibling];

    this.blockStack = [new BlockTracker()];
    this.blockElement = this.blockStack[0];
  }

  private pushElement(element) {
    this.elementStack.push(element);
    this.classListStack.push(null);
    this.nextSiblingStack.push(null);
    this.element = element;
    this.classList = null;
    this.nextSibling = null;
  }

  private popElement() {
    let { elementStack, nextSiblingStack, classListStack }  = this;
    let topElement = elementStack.pop();

    nextSiblingStack.pop();
    classListStack.pop();

    this.element = elementStack[elementStack.length - 1];
    this.nextSibling = nextSiblingStack[nextSiblingStack.length - 1];
    this.classList = classListStack[classListStack.length - 1];

    return topElement;
  }

  private pushBlock() {
    let tracker = new BlockTracker();
    this.blockStack.push(tracker);
    this.blockElement = tracker;
  }

  private popBlock() {
    let tracker = this.blockStack.pop();
    this.blockElement = this.blockStack[this.blockStack.length - 1];
    return tracker;
  }

  bounds(): Bounds {
    let { first, last } = this.blockElement;
    let { element } = this;

    return {
      parentElement() { return element },
      firstNode() { return first.firstNode(); },
      lastNode() { return last.lastNode(); }
    }
  }

  morphList(): Morph[] {
    return this.blockElement.morphs;
  }

  createContentMorph<M extends ContentMorph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions, frame: Frame): M {
    let morph = this.createMorph(Type, attrs, frame);
    this.blockElement.newBounds(morph);

    return morph;
  }

  createBlockMorph(block: Block, frame: Frame, blockArguments: EvaluatedParams): BlockInvocationMorph {
    return <BlockInvocationMorph>this.createContentMorph(BlockInvocationMorph, { block, blockArguments }, frame);
  }

  openElement(tag: string): Element {
    let element = this.dom.createElement(tag, this.element);
    this.pushElement(element);
    this.blockElement.openElement(element);
    return element;
  }

  openComponent(definition: ComponentDefinition, { tag, frame, templates, hash }: ComponentDefinitionOptions) {
    let appending = definition.begin(this, { frame, templates, hash, tag });
    let morph = appending.process();

    this.blockElement.newMorph(morph);
    morph.append(this);
  }

  openBlock() {
    this.pushBlock();
  }

  closeBlock(template: Template): RenderResult {
    let bounds = this.bounds();
    let morphs = this.morphList();
    this.popBlock();

    return new RenderResult({ template, bounds, morphs, scope: null });
  }

  createMorph<M extends Morph, InitOptions>(Type: MorphSpecializer<M, InitOptions>, attrs: InitOptions, frame: Frame): M {
    let morph = createMorph(Type, this.element, frame, attrs);
    this.blockElement.newMorph(morph);
    return morph;
  }

  appendText(string: string): Text {
    let { dom } = this;
    let text = dom.createTextNode(string);
    dom.insertBefore(this.element, text, this.nextSibling);
    this.blockElement.newNode(text);
    return text;
  }

  appendComment(string: string): Comment {
    let { dom } = this;
    let comment = dom.createComment(string);
    dom.insertBefore(this.element, comment, this.nextSibling);
    this.blockElement.newNode(comment);
    return comment;
  }

  insertHTMLBefore(nextSibling: Node, html: string): Bounds {
    if (!(this.element instanceof HTMLElement)) {
      throw new Error(`You cannot insert HTML (using triple-curlies or htmlSafe) into an SVG context: ${this.element.tagName}`)
    }

    let bounds = this.dom.insertHTMLBefore(<HTMLElement & Element>this.element, nextSibling, html);
    this.blockElement.newBounds(bounds);
    return bounds;
  }

  setAttribute(name: InternedString, value: any) {
    this.dom.setAttribute(<HTMLElement & Element>this.element, name, value);
  }

  setAttributeNS(name: InternedString, value: any, namespace: InternedString) {
    this.dom.setAttributeNS(this.element, name, value, namespace);
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
    let { classList } = this;
    this.blockElement.closeElement();
    let child = this.popElement();
    this.dom.insertBefore(this.element, child, this.nextSibling);
    return { element: child, classList };
  }

  appendHTML(html: string): Bounds {
    return this.dom.insertHTMLBefore(<HTMLElement>this.element, this.nextSibling, html);
  }
}

class BlockTracker {
  public template: Template;

  public first: FirstNode = null;
  public last: LastNode = null;
  public morphs: Morph[] = [];
  private nesting = 0;

  openElement(element: Element) {
    this.newNode(element);
    this.nesting++;
  }

  closeElement() {
    this.nesting--;
  }

  newNode(node: Node) {
    if (this.nesting !== 0) return;

    if (!this.first) {
      this.first = new First(node);
    }

    this.last = new Last(node);
  }

  newBounds(bounds: Bounds) {
    if (this.nesting !== 0) return;

    if (!this.first) {
      this.first = bounds;
    }

    this.last = bounds;
  }

  newMorph(morph: Morph) {
    this.morphs.push(morph);
  }
}