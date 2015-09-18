import { Morph } from './main';

/**

The Region family of morphs handle syntaxes that could theoretically represent multiple nodes.

TextMorph: manages a single text node, updates via .nodeValue
SingleNodeMorph: manages a single node, updated via .removeChild and insertBefore
MultiNodeMorph: manages a first and last node, updated by clearing and starting over

Region.specialize returns one of the three variants

Before .update(), we first call .guard()

.guard()

TextMorph fails the guard if the .value() of the reference is no longer text
SingleNodeMorph fails the guard if the .value() of the reference is HTML

The guard() method is responsible for cleaning itself up and returning
nextSibling.
*/

class Region extends Morph {
  init(options) {
    inner.init(options);
  }

  append() {
    let insertion = this.innerMorph();
    this._inner.append();
  }

  update() {
    this.render();
  }

  insert(insertion) {

  }
}

class TextMorph extends Morph {
  init({ reference }) {
    this._reference = reference;
    this._node = null;
  }

  append() {
    let dom = this._frame.dom();
    let node = this._node = dom.createTextNode(this._reference.value());
    dom.appendChild(this.parentNode, node);
  }

  update() {
    let { _node } = this;
    _node.nodeValue = this._reference.value();
  }
}

class SingleNodeMorph extends Morph {
  init({ reference }) {
    this._reference = reference;
    this._node = null;
  }

  append() {
    let dom = this._frame.dom();
    let node = this._node = this._reference.value();
    dom.appendChild(this.parentNode, node);
  }

  update() {
    let dom = this._frame.dom();
    let { _node } = this;
    let newNode = this._node = this._reference.value();
    dom.insertBefore(this.parentNode, newNode, _node);
    _node.parentNode.removeChild(_node);
  }
}

class HTMLMorph extends Morph {
  init({ reference }) {
    this._reference = reference;
    this._first = null;
    this._last = null;
  }

  append() {
    let { _frame, _reference, parentNode } = this;
    let dom = _frame.dom;
    let { first, last } = dom.appendHTMLBefore(parentNode, null, _reference.value());
    this._first = first;
    this._last = last;
  }

  update() {
    let { parentNode, _frame, _reference, _first, _last } = this;
    let dom = _frame.dom;

    let { first, last } = dom.appendHTMLBefore(parentNode, _first, _reference.value());
    this._first = first;
    this._last = last;

    clear(parentNode, _first, _last);
  }
}

class BlockMorph extends Morph {
  init({ reference }) {
    this._reference = reference;
    this._lastResult = null;
  }

  append() {
    this._lastResult = this._reference.value().evaluate(this, this._frame);
  }

  update() {
    this._lastResult.renderTemplate(this._reference.value());
  }
}

function clear(parent, first, last) {
  let node = first;

  while (node) {
    let next = node.nextSibling;
    parent.removeChild(node);
    if (node === last) return;
    node = next;
  }
}

// this file is shared between inline and block

export class HtmlInsertion {
  constructor(string) {
    this._string = string;
    this._first = null;
    this._last = null;
  }

  equal(other) {
    return this._string === other._string;
  }

  append(dom, parentNode, nextSibling) {
    let { first, last } = dom.appendHTMLBefore(parentNode, nextSibling, this._string);
    this._first = first;
    this._last = last;
  }

  replace() {

  }
}

export class TextInsertion {
  constructor(string) {
    this._string = string;
    this._node = null;
  }

  equal(other) {
    return this._string === other._string;
  }

  append(dom, parentNode, nextSibling) {
    let text = dom.createTextNode(this._string);
    dom.insertBefore(parentNode, text, nextSibling);
    this._node = text;
    return { first: text, last: text };
  }

  replace(insertion) {
    let newString = insertion._string;
    if (this._string === newString) return;
    this._node.nodeValue = this._string = newString;
  }
}

export class NodeInsertion {
  constructor(node) {
    this._node = node;
  }

  equal() {
    return false; // for now, if this is an important use-case we can establish heuristics
  }

  append(dom, parentNode, nextSibling) {
    let _node = this._node;
    dom.insertBefore(parentNode, _node, nextSibling);
    return { first: _node, last: _node };
  }
}

export class EmptyInsertion {
  equal() {
    return true;
  }

  append(dom, parentNode, nextSibling) {
    let comment = dom.createComment('');
    dom.insertBefore(parentNode, comment, nextSibling);
    return { first: comment, last: comment };
  }
}

export class BlockInsertion {
  constructor(template, morph) {
    this._template = template;
    this._morph = morph;
    this._lastResult = null;
  }

  append(/*dom, parentNode, nextSibling*/) {
    let result = this._lastResult = this._template.evaluate(this._morph, this._morph._frame);
    return { first: result.bounds.first, last: result.bounds.last };
  }

  replace(insertion) {
    this._lastResult = this._lastResult.renderTemplate(insertion._template);
  }
}

export class AppendingRegion {
  constructor({ dom, parentNode, morph }) {
    this._dom = dom;
    this._parentNode = parentNode;
    this._morph = morph;
  }

  replace(insertion) {
    let { first, last } = insertion.append(this._dom, this._parentNode, null);
    let { _dom, _parentNode } = this;
    this._morph._region = new UpdatingRegion({ first, last, lastInsertion: insertion, dom: _dom, parentNode: _parentNode });
  }

  renderTemplate(template, morph) {
    let insertion = new BlockInsertion(template, morph);
    this.replace(insertion);
  }
}

export class UpdatingRegion {
  constructor({ dom, lastInsertion, parentNode, first, last }) {
    this._dom = dom;
    this._parentNode = parentNode;
    this._lastResult = null;
    this._first = first;
    this._last = last;
    this._lastInsertion = lastInsertion;
  }

  replace(insertion) {
    let { _lastInsertion } = this;

    if (insertion instanceof _lastInsertion.constructor && _lastInsertion.replace) {
      _lastInsertion.replace(insertion);
    } else {
      let { first, last } = insertion.append(this._dom, this._parentNode, this._clear());
      this._lastInsertion = insertion;
      this._first = first;
      this._last = last;
    }
  }

  renderTemplate(template, morph) {
    let insertion = new BlockInsertion(template, morph);
    this.replace(insertion);
  }

  _clear() {
    let { _first, _last, _parentNode } = this;
    let node = _first;

    while (node) {
      let next = node.nextSibling;
      _parentNode.removeChild(node);
      if (node === _last) return next;
      node = next;
    }

    return null;
  }
}

export class RegionMorph extends Morph {
  init() {
    this._region = new AppendingRegion({ dom: this._frame.dom(), parentNode: this.parentNode, morph: this });
    this.isDynamic = true;
  }

  append() {
    this.render();
  }

  update() {
    this.render();
  }

  renderTemplate(template) {
    this._region.renderTemplate(template, this, this._frame);
  }

  render() {
    throw new Error("Not implemented: render() for subclass of RegionMorph");
  }

  replace(insertion) {
    this._region.replace(insertion);
  }
}

