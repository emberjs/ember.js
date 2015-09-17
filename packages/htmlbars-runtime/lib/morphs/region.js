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
}

export class TextInsertion {
  constructor(string) {
    this._string = string;
  }

  equal(other) {
    return this._string === other._string;
  }

  append(dom, parentNode, nextSibling) {
    let { _string } = this;
    let text = dom.createTextNode(_string);
    dom.insertBefore(parentNode, dom.createTextNode(_string), nextSibling);
    return { first: text, last: text };
  }
}

export class NodeInsertion {
  constructor(node) {
    this.node = node;
  }

  equal() {
    return false; // for now, if this is an important use-case we can establish heuristics
  }

  append(dom, parentNode, nextSibling) {
    let node = this.node;
    dom.insertBefore(parentNode, node, nextSibling);
    return { first: node, last: node };
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

export class AppendingRegion {
  // next sibling is for appending after the first time
  constructor({ dom, parentNode, nextSibling, morph }) {
    this._dom = dom;
    this._parentNode = parentNode;
    this._nextSibling = nextSibling || null;
    this._morph = morph;

    this._lastValue = null;
  }

  replace(insertion) {
    let { first, last } = insertion.append(this._dom, this._parentNode, this._nextSibling);
    let { _dom, _parentNode } = this;
    this._morph._region = new UpdatingRegion({ first, last, lastValue: insertion, dom: _dom, parentNode: _parentNode });
  }
}

export class UpdatingRegion {
  constructor({ dom, lastValue, parentNode, first, last }) {
    this._dom = dom;
    this._parentNode = parentNode;
    this._first = first;
    this._last = last;
    this._lastValue = lastValue;
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

  render() {
    throw new Error("Not implemented: render() for subclass of RegionMorph");
  }

  replace(insertion) {
    this._region.replace(insertion);
  }
}

