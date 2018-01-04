import { fireEvent, matches } from '../system/synthetic-events';

export default class NodeQuery {
  static query(selector, context = document) {
    return new NodeQuery(context.querySelectorAll(selector));
  }

  static element(element) {
    return new NodeQuery([element]);
  }

  constructor(nodes) {
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

    for (let node of this.nodes) {
      nodes.push(...node.querySelectorAll(selector));
    }

    return new NodeQuery(nodes);
  }

  trigger(eventName, options) {
    let events = [];

    for (let node of this.nodes) {
      events.push(fireEvent(node, eventName, options));
    }

    return events;
  }

  click() {
    return this.trigger('click');
  }

  text() {
    let out = "";

    for (let node of this.nodes) {
      out += node.innerText;
    }

    return out;
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
    for (let node of this.nodes) {
      node[name] = value;
    }

    return this;
  }

  val(value) {
    if (arguments.length === 1) {
      return this.setProp('value', value);
    }

    return this.prop('value');
  }

  is(selector) {
    for (let node of this.nodes) {
      if (!matches(node, selector)) {
        return false;
      }
    }

    return true;
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
