import { Morph } from '../morph';

export abstract class RegionMorph<T> extends Morph<T> {

}

// /**

// The Region family of morphs handle syntaxes that could theoretically represent multiple nodes.

// TextMorph: manages a single text node, updates via .nodeValue
// SingleNodeMorph: manages a single node, updated via .removeChild and insertBefore
// MultiNodeMorph: manages a first and last node, updated by clearing and starting over

// Region.specialize returns one of the three variants

// Before .update(), we first call .guard()

// .guard()

// TextMorph fails the guard if the .value() of the reference is no longer text
// SingleNodeMorph fails the guard if the .value() of the reference is HTML

// The guard() method is responsible for cleaning itself up and returning
// nextSibling.
// */

// class Region extends Morph {
//   init(options) {
//     inner.init(options);
//   }

//   append() {
//     let insertion = this.innerMorph();
//     this._inner.append();
//   }

//   update() {
//     this.render();
//   }

//   insert(insertion) {

//   }

//   destroy() {}
// }

// class TextMorph extends Morph {
//   init({ reference }) {
//     this._reference = reference;
//     this._node = null;
//   }

//   append() {
//     let dom = this._frame.dom();
//     let node = this._node = dom.createTextNode(this._reference.value());
//     dom.appendChild(this.parentNode, node);
//   }

//   update() {
//     let { _node } = this;
//     _node.nodeValue = this._reference.value();
//   }
// }

// class SingleNodeMorph extends Morph {
//   init({ reference }) {
//     this._reference = reference;
//     this._node = null;
//   }

//   append() {
//     let dom = this._frame.dom();
//     let node = this._node = this._reference.value();
//     dom.appendChild(this.parentNode, node);
//   }

//   update() {
//     let dom = this._frame.dom();
//     let { _node } = this;
//     let newNode = this._node = this._reference.value();
//     dom.insertBefore(this.parentNode, newNode, _node);
//     _node.parentNode.removeChild(_node);
//   }
// }

// class HTMLMorph extends Morph {
//   init({ reference }) {
//     this._reference = reference;
//     this._first = null;
//     this._last = null;
//   }

//   append() {
//     let { _frame, _reference, parentNode } = this;
//     let dom = _frame.dom;
//     let { first, last } = dom.appendHTMLBefore(parentNode, null, _reference.value());
//     this._first = first;
//     this._last = last;
//   }

//   update() {
//     let { parentNode, _frame, _reference, _first, _last } = this;
//     let dom = _frame.dom;

//     let { first, last } = dom.appendHTMLBefore(parentNode, _first, _reference.value());
//     this._first = first;
//     this._last = last;

//     clear(parentNode, _first, _last);
//   }
// }

// class BlockMorph extends Morph {
//   init({ reference }) {
//     this._reference = reference;
//     this._lastResult = null;
//   }

//   append() {
//     this._lastResult = this._reference.value().evaluate(this, this._frame);
//   }

//   update() {
//     this._lastResult.renderTemplate(this._reference.value());
//   }
// }

// function clear(parent, first, last) {
//   let node = first;

//   while (node) {
//     let next = node.nextSibling;
//     parent.removeChild(node);
//     if (node === last) return;
//     node = next;
//   }
// }