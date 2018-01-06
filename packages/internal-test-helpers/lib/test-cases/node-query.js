/* global Node */

import { assert } from 'ember-debug';
import { fireEvent, focus, matches } from '../system/synthetic-events';

export default class NodeQuery {
  static query(selector, context = document) {
    assert(`Invalid second parameter to NodeQuery.query`, context && context instanceof Node);
    return new NodeQuery(toArray(context.querySelectorAll(selector)));
  }

  static element(element) {
    return new NodeQuery([element]);
  }

  constructor(nodes) {
    assert('NodeQuery must be initialized with a literal array', Array.isArray(nodes));
    this.nodes = nodes;

    for (let i=0; i<nodes.length; i++) {
      this[i] = nodes[i];
    }

    this.length = nodes.length;

    Object.freeze(this);
  }

  find(selector) {
    assertSingle(this);

    return this[0].querySelector(selector);
  }

  findAll(selector) {
    let nodes = [];

    this.nodes.forEach(node => {
      nodes.push(...node.querySelectorAll(selector));
    });

    return new NodeQuery(nodes);
  }

  trigger(eventName, options) {
    return this.nodes.map(node => fireEvent(node, eventName, options));
  }

  click() {
    return this.trigger('click');
  }

  focus() {
    this.nodes.forEach(focus);
  }

  text() {
    return this.nodes.map(node => node.textContent).join('');
  }

  attr(name) {
    if (arguments.length !== 1) {
      throw new Error('not implemented');
    }

    assertSingle(this);

    return this.nodes[0].getAttribute(name);
  }

  prop(name, value) {
    if (arguments.length > 1) {
      return this.setProp(name, value);
    }

    assertSingle(this);

    return this.nodes[0][name];
  }

  setProp(name, value) {
    this.nodes.forEach(node => node[name] = value);

    return this;
  }

  val(value) {
    if (arguments.length === 1) {
      return this.setProp('value', value);
    }

    return this.prop('value');
  }

  is(selector) {
    return this.nodes.every(node => matches(node, selector));
  }

  hasClass(className) {
    return this.is(`.${className}`);
  }
}

function assertSingle(nodeQuery) {
  if (nodeQuery.length !== 1) {
    throw new Error(`attr(name) called on a NodeQuery with ${this.nodes.length} elements. Expected one element.`);
  }
}

function toArray(nodes) {
  let out = [];

  for (let i=0; i<nodes.length; i++) {
    out.push(nodes[i]);
  }

  return out;
}
