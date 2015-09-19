import { Morph, MorphList } from './morph';
import { Frame } from './hooks';
import DOMHelper from './dom';

// Builders are created for each template the first time it is rendered.
// The builder walks through all statements, static and dynamic, and
// returns a result containing just the static statements with the
// dynamic morphs created for the statements. Subsequent rerenders
// can simply walk over the statements and apply them to the morphs.
export default class Builder {
  private frame: Frame;
  private parentMorph: Morph;
  private stack: ElementStack;
  private morphs: Morph[];

  constructor(morph, frame) {
    this.frame = frame;

    this.parentMorph = morph;
    this.stack = new ElementStack({ builder: this, frame, morph });
    this.morphs = [];
  }

  morphList(): MorphList {
    return this.morphs;
  }

  bounds() {
    return this.stack.bounds();
  }

  /// Interaction with ElementStack

  createMorph(Type, attrs, parentElement) {
    Type = Type.specialize(attrs);
    let morph = new Type(parentElement, this.frame);
    morph.init(attrs);
    this.morphs.push(morph);
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
  private morph: Morph;
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

  bounds() {
    return {
      first: this.firstNode,
      last: this.lastNode,
      parent: this.element
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

  createMorph(Type, attrs) {
    return this.builder.createMorph(Type, attrs, this.element);
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

  appendText(text) {
    this.operations.appendText(text);
  }

  _appendText(text) {
    let node = this.dom.createTextNode(text);
    this.dom.insertBefore(this.element, node, this.nextSibling);
    return node;
  }

  appendComment(comment) {
    this.operations.appendComment(comment);
  }

  _appendComment(comment) {
    let node = this.dom.createComment(comment);
    this.dom.insertBefore(this.element, node, this.nextSibling);
    return node;
  }

  openElement(tag) {
    this.operations.openElement(tag);
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
  
  newNode(node) {
    if (!this.firstNode) this.firstNode = node;
    this.lastNode = node;
  }
}

interface Operations {
  appendText(text: string): void;
  appendComment(value: string): void;
  openElement(tag: string): Element;
  closeElement(): void;
}

class TopLevelOperations implements Operations {
  private stack: ElementStack;
  private nested: NestedOperations;
  
  constructor(stack) {
    this.stack = stack;
    this.nested = null;
  }

  appendText(text) {
    let node = this.stack._appendText(text);
    this._newNode(node);
  }

  appendComment(value) {
    let node = this.stack._appendComment(value);
    this._newNode(node);
  }

  openElement(tag) {
    let element = this.stack._openElement(tag);
    this._newNode(element);

    let nestedOperations = this.nested = this.nested || new NestedOperations(this.stack, this);
    this.stack.operations = nestedOperations;

    return element;
  }

  _newNode(node) {
    let stack = this.stack;
    if (!stack.firstNode) stack.firstNode = node;
    stack.lastNode = node; 
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

  appendText(text) {
    this.stack._appendText(text);
  }

  appendComment(value) {
    this.stack._appendComment(value);
  }

  openElement(tag) {
    this.level++;
    return this.stack._openElement(tag);
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
