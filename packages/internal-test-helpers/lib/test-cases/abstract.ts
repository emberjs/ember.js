/* global Element */

import NodeQuery from '../node-query';
import equalInnerHTML from '../equal-inner-html';
import equalTokens from '../equal-tokens';
import { getElement } from '../element-helpers';
import { equalsElement, regex, classes } from '../matchers';
import { runLoopSettled } from '../run';
import { assert } from '@ember/debug';

const TextNode = window.Text;
const HTMLElement = window.HTMLElement;
const Comment = window.Comment;

function isMarker(node: unknown): node is Comment | typeof TextNode {
  if (node instanceof Comment && node.textContent === '') {
    return true;
  }

  if (node instanceof TextNode && node.textContent === '') {
    return true;
  }

  return false;
}

export default abstract class AbstractTestCase {
  snapshot: ChildNode[] | null;
  assert: QUnit['assert'];

  get fixture(): string | undefined {
    return undefined;
  }

  constructor(assert: QUnit['assert']) {
    this.snapshot = null;
    this.assert = assert;

    let { fixture } = this;
    if (fixture) {
      this.setupFixture(fixture);
    }
  }

  teardown() {}
  beforeEach(_assert: QUnit['assert']) {}
  afterEach() {}

  setupFixture(innerHTML: string) {
    let fixture = document.getElementById('qunit-fixture')!;
    fixture.innerHTML = innerHTML;
  }

  // The following methods require `this.element` to work

  get firstChild() {
    return this.nthChild(0);
  }

  nthChild(n: number) {
    let i = 0;
    let node = getElement().firstChild;

    while (node) {
      if (!isMarker(node)) {
        i++;
      }

      if (i > n) {
        break;
      } else {
        node = node.nextSibling;
      }
    }

    return node;
  }

  get nodesCount() {
    let count = 0;
    let node = getElement().firstChild;

    while (node) {
      if (!isMarker(node)) {
        count++;
      }

      node = node.nextSibling;
    }

    return count;
  }

  $(sel?: string | HTMLElement) {
    if (sel instanceof HTMLElement) {
      return NodeQuery.element(sel);
    } else if (typeof sel === 'string') {
      return NodeQuery.query(sel, getElement());
    } else if (sel !== undefined) {
      throw new Error(`Invalid this.$(${sel})`);
    } else {
      return NodeQuery.element(getElement());
    }
  }

  wrap(element: HTMLElement) {
    return NodeQuery.element(element);
  }

  click(selector: HTMLElement | string) {
    let element;
    if (typeof selector === 'string') {
      element = getElement().querySelector(selector) as HTMLElement | null;
    } else {
      element = selector;
    }

    let event = element!.click();

    return runLoopSettled(event);
  }

  textValue() {
    return getElement().textContent;
  }

  takeSnapshot() {
    let snapshot: ChildNode[] = (this.snapshot = []);

    let node = getElement().firstChild;

    while (node) {
      if (!isMarker(node)) {
        snapshot.push(node);
      }

      node = node.nextSibling;
    }

    return snapshot;
  }

  assertText(text: string) {
    this.assert.strictEqual(
      this.textValue(),
      text,
      `#qunit-fixture content should be: \`${text}\``
    );
  }

  assertInnerHTML(html: string) {
    equalInnerHTML(this.assert, getElement(), html);
  }

  assertHTML(html: string) {
    equalTokens(getElement(), html, `#qunit-fixture content should be: \`${html}\``);
  }

  assertElement(
    node: HTMLElement,
    {
      ElementType = HTMLElement,
      tagName,
      attrs = null,
      content = null,
    }: {
      ElementType?: typeof HTMLElement;
      tagName: string;
      attrs?: Record<string, unknown> | null;
      content?: unknown;
    }
  ) {
    if (!(node instanceof ElementType)) {
      throw new Error(`Expecting a ${ElementType.name}, but got ${String(node)}`);
    }

    equalsElement(this.assert, node, tagName, attrs, content);
  }

  assertComponentElement(
    node: HTMLElement,
    {
      ElementType = HTMLElement,
      tagName = 'div',
      attrs = {},
      content = null,
    }: {
      ElementType?: typeof HTMLElement;
      tagName: string;
      attrs?: Record<string, unknown>;
      content?: unknown;
    }
  ) {
    attrs = Object.assign(
      {},
      { id: regex(/^ember\d*$/), class: classes('ember-view') },
      attrs || {}
    );
    this.assertElement(node, { ElementType, tagName, attrs, content });
  }

  assertSameNode(actual: ChildNode | undefined, expected: ChildNode | undefined) {
    this.assert.strictEqual(actual, expected, 'DOM node stability');
  }

  assertInvariants(): void;
  assertInvariants(oldSnapshot: ChildNode[], newSnapshot: ChildNode[]): void;
  assertInvariants(oldSnapshot?: ChildNode[], newSnapshot?: ChildNode[]): void {
    if (!oldSnapshot) {
      assert('expected an existing snapshot', this.snapshot);
      oldSnapshot = this.snapshot;
    }
    newSnapshot = newSnapshot || this.takeSnapshot();

    this.assert.strictEqual(newSnapshot.length, oldSnapshot.length, 'Same number of nodes');

    for (let i = 0; i < oldSnapshot.length; i++) {
      this.assertSameNode(newSnapshot[i], oldSnapshot[i]);
    }
  }

  assertPartialInvariants(start: number, end: number) {
    assert('expected an existing snapshot', this.snapshot);
    this.assertInvariants(this.snapshot, this.takeSnapshot().slice(start, end));
  }
}
