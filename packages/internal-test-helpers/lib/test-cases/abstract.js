/* global Element */

import { assign } from '@ember/polyfills';
import { getCurrentRunLoop, hasScheduledTimers, next, run } from '@ember/runloop';

import NodeQuery from '../node-query';
import equalInnerHTML from '../equal-inner-html';
import equalTokens from '../equal-tokens';
import { equalsElement, regex, classes } from '../matchers';
import { Promise } from 'rsvp';

const TextNode = window.Text;
const HTMLElement = window.HTMLElement;
const Comment = window.Comment;

function isMarker(node) {
  if (node instanceof Comment && node.textContent === '') {
    return true;
  }

  if (node instanceof TextNode && node.textContent === '') {
    return true;
  }

  return false;
}

export default class AbstractTestCase {
  constructor(assert) {
    this.element = null;
    this.snapshot = null;
    this.assert = assert;

    let { fixture } = this;
    if (fixture) {
      this.setupFixture(fixture);
    }
  }

  teardown() {}
  afterEach() {}

  runTask(callback) {
    return run(callback);
  }

  runTaskNext() {
    return new Promise(resolve => {
      return next(resolve);
    });
  }

  setupFixture(innerHTML) {
    let fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = innerHTML;
  }

  // The following methods require `this.element` to work

  get firstChild() {
    return this.nthChild(0);
  }

  nthChild(n) {
    let i = 0;
    let node = this.element.firstChild;

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
    let node = this.element.firstChild;

    while (node) {
      if (!isMarker(node)) {
        count++;
      }

      node = node.nextSibling;
    }

    return count;
  }

  $(sel) {
    if (sel instanceof Element) {
      return NodeQuery.element(sel);
    } else if (typeof sel === 'string') {
      return NodeQuery.query(sel, this.element);
    } else if (sel !== undefined) {
      throw new Error(`Invalid this.$(${sel})`);
    } else {
      return NodeQuery.element(this.element);
    }
  }

  wrap(element) {
    return NodeQuery.element(element);
  }

  click(selector) {
    let element;
    if (typeof selector === 'string') {
      element = this.element.querySelector(selector);
    } else {
      element = selector;
    }

    let event = element.click();

    return this.runLoopSettled(event);
  }

  // TODO: Find a better name 😎
  runLoopSettled(value) {
    return new Promise(function(resolve) {
      // Every 5ms, poll for the async thing to have finished
      let watcher = setInterval(() => {
        // If there are scheduled timers or we are inside of a run loop, keep polling
        if (hasScheduledTimers() || getCurrentRunLoop()) {
          return;
        }

        // Stop polling
        clearInterval(watcher);

        // Synchronously resolve the promise
        resolve(value);
      }, 5);
    });
  }

  textValue() {
    return this.element.textContent;
  }

  takeSnapshot() {
    let snapshot = (this.snapshot = []);

    let node = this.element.firstChild;

    while (node) {
      if (!isMarker(node)) {
        snapshot.push(node);
      }

      node = node.nextSibling;
    }

    return snapshot;
  }

  assertText(text) {
    this.assert.strictEqual(
      this.textValue(),
      text,
      `#qunit-fixture content should be: \`${text}\``
    );
  }

  assertInnerHTML(html) {
    equalInnerHTML(this.assert, this.element, html);
  }

  assertHTML(html) {
    equalTokens(this.element, html, `#qunit-fixture content should be: \`${html}\``);
  }

  assertElement(node, { ElementType = HTMLElement, tagName, attrs = null, content = null }) {
    if (!(node instanceof ElementType)) {
      throw new Error(`Expecting a ${ElementType.name}, but got ${node}`);
    }

    equalsElement(this.assert, node, tagName, attrs, content);
  }

  assertComponentElement(
    node,
    { ElementType = HTMLElement, tagName = 'div', attrs = null, content = null }
  ) {
    attrs = assign({}, { id: regex(/^ember\d*$/), class: classes('ember-view') }, attrs || {});
    this.assertElement(node, { ElementType, tagName, attrs, content });
  }

  assertSameNode(actual, expected) {
    this.assert.strictEqual(actual, expected, 'DOM node stability');
  }

  assertInvariants(oldSnapshot, newSnapshot) {
    oldSnapshot = oldSnapshot || this.snapshot;
    newSnapshot = newSnapshot || this.takeSnapshot();

    this.assert.strictEqual(newSnapshot.length, oldSnapshot.length, 'Same number of nodes');

    for (let i = 0; i < oldSnapshot.length; i++) {
      this.assertSameNode(newSnapshot[i], oldSnapshot[i]);
    }
  }

  assertPartialInvariants(start, end) {
    this.assertInvariants(this.snapshot, this.takeSnapshot().slice(start, end));
  }

  assertStableRerender() {
    this.takeSnapshot();
    this.runTask(() => this.rerender());
    this.assertInvariants();
  }
}
