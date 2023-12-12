/* global Node */

import { assert } from '@ember/debug';
import type { KEYBOARD_EVENT_TYPES, MOUSE_EVENT_TYPES } from './system/synthetic-events';
import { blur, fireEvent, focus, matches } from './system/synthetic-events';

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

  [index: number]: Element;

  constructor(nodes: Element[]) {
    assert('NodeQuery must be initialized with a literal array', Array.isArray(nodes));
    this.nodes = nodes;

    for (let i = 0; i < nodes.length; i++) {
      this[i] = nodes[i]!;
    }

    this.length = nodes.length;

    Object.freeze(this);
  }

  find<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
  find<K extends keyof SVGElementTagNameMap>(selectors: K): SVGElementTagNameMap[K] | null;
  find<E extends Element = Element>(selectors: string): E | null;
  find(selector: string) {
    assertSingle(this);

    return this[0]!.querySelector(selector);
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
  prop(name: string, value: unknown): this;
  prop(name: string, value?: unknown): this | unknown {
    if (arguments.length > 1) {
      return this.setProp(name, value);
    }

    assertSingle(this);

    // SAFETY: This is not safe. We don't know that the node accepts this key.
    return (this.nodes[0] as any)[name];
  }

  setProp(name: string, value: unknown) {
    // SAFETY: This is not safe. We don't know that the node accepts this key.
    this.nodes.forEach((node) => ((node as any)[name] = value));

    return this;
  }

  val(): unknown;
  val(value: unknown): this;
  val(value?: unknown): this | unknown {
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
