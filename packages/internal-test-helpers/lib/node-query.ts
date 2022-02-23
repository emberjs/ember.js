/* global Node */

import { assert } from '@ember/debug';
import {
  blur,
  fireEvent,
  focus,
  KEYBOARD_EVENT_TYPES,
  matches,
  MOUSE_EVENT_TYPES,
} from './system/synthetic-events';

export default class NodeQuery {
  static query(selector: string, context: Document | DocumentFragment | Element = document) {
    // TODO: Can we remove this?
    assert(`Invalid second parameter to NodeQuery.query`, context && context instanceof Node);
    return new NodeQuery(Array.from(context.querySelectorAll(selector)));
  }

  static element(element: HTMLElement): NodeQuery {
    return new NodeQuery([element]);
  }

  nodes: Element[];
  length: number;

  constructor(nodes: Element[]) {
    assert('NodeQuery must be initialized with a literal array', Array.isArray(nodes));
    this.nodes = nodes;

    for (let i = 0; i < nodes.length; i++) {
      this[i] = nodes[i];
    }

    this.length = nodes.length;

    Object.freeze(this);
  }

  find(selector: string | Element) {
    assertSingle(this);

    return this[0].querySelector(selector);
  }

  findAll(selector: string): NodeQuery {
    let nodes: Element[] = [];

    this.nodes.forEach((node) => {
      nodes.push(...node.querySelectorAll(selector));
    });

    return new NodeQuery(nodes);
  }

  trigger<T extends keyof typeof KEYBOARD_EVENT_TYPES>(
    eventName: T,
    options?: KeyboardEventInit
  ): void;
  trigger<T extends keyof typeof MOUSE_EVENT_TYPES>(eventName: T, options?: MouseEventInit): void;
  trigger(eventName: string, options?: EventInit): void;
  trigger(eventName: string, options: EventInit = {}) {
    return this.nodes.map((node) => fireEvent(node, eventName, options));
  }

  click() {
    return this.trigger('click');
  }

  focus() {
    this.nodes.forEach(focus);
  }

  blur() {
    this.nodes.forEach(blur);
  }

  text() {
    return this.nodes.map((node) => node.textContent).join('');
  }

  attr(name: string) {
    if (arguments.length !== 1) {
      throw new Error('not implemented');
    }

    assertSingle(this);

    return this.nodes[0]!.getAttribute(name);
  }

  prop(name: string): unknown;
  prop(name: string, value: unknown): unknown;
  prop(name: string, value?: unknown) {
    if (arguments.length > 1) {
      return this.setProp(name, value);
    }

    assertSingle(this);

    return this.nodes[0]![name];
  }

  setProp(name: string, value: unknown) {
    this.nodes.forEach((node) => (node[name] = value));

    return this;
  }

  val(): unknown;
  val(value: unknown): unknown;
  val(value?: unknown): unknown {
    if (arguments.length === 1) {
      return this.setProp('value', value);
    }

    return this.prop('value');
  }

  is(selector: string) {
    return this.nodes.every((node) => matches(node, selector));
  }

  hasClass(className: string) {
    return this.is(`.${className}`);
  }
}

function assertSingle(nodeQuery: NodeQuery) {
  if (nodeQuery.length !== 1) {
    throw new Error(
      `attr(name) called on a NodeQuery with ${nodeQuery.length} elements. Expected one element.`
    );
  }
}
