import { Morph } from './main';

// this file is shared between inline and block

export class HtmlInsertion {
  constructor(string) {
    this._string = string;
  }

  equal(other) {
    return this._string === other._string;
  }

  append(dom, parentNode, nextSibling) {
    return dom.appendHTMLBefore(parentNode, nextSibling, this._string);
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
    let result = this._lastResult = this._template.renderIn(this._morph, this._morph._frame);
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

