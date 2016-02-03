import packageName from './package-name';
import Environment from './environment';
import { compile, DOMHelper, Renderer } from './helpers';
import { equalTokens } from 'glimmer-test-helpers';
import run from 'ember-metal/run_loop';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import Component from 'ember-views/components/component';
import jQuery from 'ember-views/system/jquery';
import assign from 'ember-metal/assign';
import { OWNER } from 'container/owner';
import buildOwner from 'container/tests/test-helpers/build-owner';

const packageTag = `@${packageName} `;

export function moduleFor(description, TestClass) {
  let context;

  QUnit.module(`[${packageName}] ${description}`, {
    setup() {
      context = new TestClass();
    },

    teardown() {
      context.teardown();
    }
  });

  Object.keys(TestClass.prototype).forEach(name => {
    if (name.indexOf('@test ') === 0) {
      QUnit.test(name.slice(5), assert => context[name](assert));
    } else if (name.indexOf('@skip ') === 0) {
      QUnit.skip(name.slice(5), assert => context[name](assert));
    } else if (name.indexOf(packageTag) === 0) {
      QUnit.test(name.slice(packageTag.length), assert => context[name](assert));
    }
  });
}

let assert = QUnit.assert;

const TextNode = window.Text;
const HTMLElement = window.HTMLElement;
const Comment = window.Comment;

export class TestCase {
  teardown() {}
}

function isMarker(node) {
  if (node instanceof Comment && node.textContent === '') {
    return true;
  }

  if (node instanceof TextNode && node.textContent === '') {
    return true;
  }

  return false;
}

export class RenderingTest extends TestCase {
  constructor() {
    super();
    let dom = new DOMHelper(document);
    let env = this.env = new Environment(dom);
    this.renderer = new Renderer(dom, { destinedForDOM: true, env });
    this.component = null;
    this.element = jQuery('#qunit-fixture')[0];
    this.owner = buildOwner();
  }

  teardown() {
    if (this.component) {
      runDestroy(this.component);
    }
  }

  get context() {
    return this.component;
  }

  get firstChild() {
    let node = this.element.firstChild;

    while (node && isMarker(node)) {
      node = node.nextSibling;
    }

    return node;
  }

  render(templateStr, context = {}) {
    let { env, renderer, owner } = this;

    let attrs = assign({}, context, {
      tagName: '',
      [OWNER]: owner,
      renderer,
      template: compile(templateStr, { env })
    });

    this.component = Component.create(attrs);

    runAppend(this.component);
  }

  rerender() {
    this.component.rerender();
  }

  // The callback represents user code called by the browser, known as a "zone". It is
  // equivalent to the concept of an Ember "run loop".
  //
  // For (a lot) more information, see the TC39 proposal:
  // https://docs.google.com/presentation/d/1H3E2ToJ8VHgZS8eS6bRv-vg5OksObj5wv6gyzJJwOK0
  inZone(callback) {
    run(() => {
      callback();
      this.component.rerender();
    });
  }

  assertText(text) {
    assert.strictEqual(jQuery(this.element).text(), text, '#qunit-fixture content');
  }

  assertHTML(html) {
    equalTokens(this.element, html, '#qunit-fixture content');
  }

  assertTextNode(node, text) {
    if (!(node instanceof TextNode)) {
      throw new Error(`Expecting a text node, but got ${node}`);
    }

    assert.strictEqual(node.textContent, text, 'node.textContent');
  }

  assertElement(node, { ElementType = HTMLElement, tagName }) {
    if (!(node instanceof ElementType)) {
      throw new Error(`Expecting a ${ElementType.name}, but got ${node}`);
    }

    assert.strictEqual(node.tagName, tagName.toUpperCase(), 'node.tagName');
  }

  assertSameNode(node1, node2) {
    assert.strictEqual(node1, node2, 'DOM node stability');
  }
}
