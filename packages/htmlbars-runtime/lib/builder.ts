import { Morph, MorphList } from './morph';
import { Frame } from './hooks';

// Builders are created for each template the first time it is rendered.
// The builder walks through all statements, static and dynamic, and
// returns a result containing just the static statements with the
// dynamic morphs created for the statements. Subsequent rerenders
// can simply walk over the statements and apply them to the morphs.
export default class Builder {
  _frame: Frame;
  _parentMorph: Morph;
  _stack: ElementStack;
  _morphs: Morph[];

  constructor(morph, frame) {
    this._frame = frame;

    this._parentMorph = morph;
    this._stack = new ElementStack({ builder: this, frame, morph });
    this._morphs = [];
  }

  morphs(): MorphList {
    return this._morphs;
  }

  bounds() {
    return this._stack.bounds();
  }

  /// Interaction with ElementStack

  createMorph(Type, attrs, parentElement) {
    Type = Type.specialize(attrs);
    let morph = new Type(parentElement, this._frame);
    morph.init(attrs);
    this._morphs.push(morph);
    return morph;
  }

  /// Utilities

  render(statement) {
    let { _stack, _frame } = this;

    if (statement.isStatic) {
      statement.evaluate(_stack);
      return;
    }

    //let syntaxExtension = _frame.syntaxExtension(statement);
    let content = statement.evaluate(_stack, _frame);
    content.append(_stack);
  }
}

interface DOMHelper {}

export class ElementStack {
  _builder: Builder;
  _frame: Frame;
  _dom: DOMHelper;
  _morph: Morph;
  _operations: Operations;
  _element: HTMLElement;
  _nextSibling: Node;
  _elementStack: HTMLElement[];
  _nextSiblingStack: Node[];
  _firstNode: Node;
  _lastNode: Node;

  constructor({ builder, frame, morph }) {
    this._builder = builder;
    this._frame = frame;
    this._dom = frame.dom();
    this._morph = morph;
    this._operations = new TopLevelOperations(this);
    this._element = morph.parentNode;
    this._nextSibling = morph.nextSibling;
    this._elementStack = [morph.parentNode];
    this._nextSiblingStack = [morph.nextSibling];
    
    this._firstNode = null;
    this._lastNode = null;
  }

  bounds() {
    return {
      first: this._firstNode,
      last: this._lastNode,
      parent: this._element
    };
  }

  _pushElement(element) {
    this._elementStack.push(element);
    this._nextSiblingStack.push(null);
    this._element = element;
  }

  _popElement() {
    let { _elementStack, _nextSiblingStack }  = this;
    let topElement = _elementStack.pop();
    _nextSiblingStack.pop();
    this._element = _elementStack[_elementStack.length - 1];
    this._nextSibling = _nextSiblingStack[_nextSiblingStack.length - 1];
    return topElement;
  }

  appendStatement(statement) {
    this._builder.render(statement);
  }

  createMorph(Type, attrs) {
    return this._builder.createMorph(Type, attrs, this._element);
  }

  appendMorph(Type, attrs) {
    this.createMorph(Type, attrs).append(this);
  }

  setAttribute(name, value) {
    this._dom.setAttribute(this._element, name, value);
  }

  setAttributeNS(name, value, namespace) {
    this._dom.setAttributeNS(this._element, name, value, namespace);
  }

  appendText(text) {
    this._operations.appendText(text);
  }

  _appendText(text) {
    let node = this._dom.createTextNode(text);
    this._dom.insertBefore(this._element, node, this._nextSibling);
    return node;
  }

  appendComment(comment) {
    this._operations.appendComment(comment);
  }

  _appendComment(comment) {
    let node = this._dom.createComment(comment);
    this._dom.insertBefore(this._element, node, this._nextSibling);
    return node;
  }

  openElement(tag) {
    this._operations.openElement(tag);
  }

  _openElement(tag) {
    let element = this._dom.createElement(tag, this.contextualElement);
    this._pushElement(element);
    return element;
  }

  closeElement() {
    this._operations.closeElement();
  }

  _closeElement() {
    let child = this._popElement();
    this._dom.insertBefore(this._element, child, this._nextSibling);
  }
  
  newNode(node) {
    if (!this._firstNode) this._firstNode = node;
    this._lastNode = node;
  }
}

interface Operations {
  appendText(text: string): void;
  appendComment(value: string): void;
  openElement(tag: string): HTMLElement;
  closeElement(): void;
}

class TopLevelOperations implements Operations {
  _stack: ElementStack;
  _nested: NestedOperations;
  
  constructor(stack) {
    this._stack = stack;
    this._nested = null;
  }

  appendText(text) {
    let node = this._stack._appendText(text);
    this._newNode(node);
  }

  appendComment(value) {
    let node = this._stack._appendComment(value);
    this._newNode(node);
  }

  openElement(tag) {
    let element = this._stack._openElement(tag);
    this._newNode(element);

    let nestedOperations = this._nested = this._nested || new NestedOperations(this._stack, this);
    this._stack._operations = nestedOperations;

    return element;
  }

  _newNode(node) {
    let _stack = this._stack;
    if (!_stack._firstNode) _stack._firstNode = node;
    _stack._lastNode = node; 
  }

  closeElement() {
    throw new Error("BUG: Unbalanced open and close element");
  }
}

class NestedOperations implements Operations {
  _level: number;
  _stack: ElementStack;
  _topLevel: TopLevelOperations;
  
  constructor(stack, topLevel) {
    this._level = 1;
    this._stack = stack;
    this._topLevel = topLevel;
  }

  appendText(text) {
    this._stack._appendText(text);
  }

  appendComment(value) {
    this._stack._appendComment(value);
  }

  openElement(tag) {
    this._level++;
    return this._stack._openElement(tag);
  }

  closeElement() {
    this._stack._closeElement();

    if (this._level === 1) {
      this._stack._operations = this._topLevel;
    } else {
      this._level--;
    }
  }
}
