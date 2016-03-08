import packageName from './package-name';
import Environment from './environment';
import { compile, helper, Helper, DOMHelper, Renderer } from './helpers';
import { equalsElement, equalTokens, regex, classes } from './test-helpers';
import run from 'ember-metal/run_loop';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import Component from 'ember-views/components/component';
import jQuery from 'ember-views/system/jquery';
import assign from 'ember-metal/assign';
import { OWNER } from 'container/owner';
import buildOwner from 'container/tests/test-helpers/build-owner';

const packageTag = `@${packageName} `;

function isGenerator(mixin) {
  return Array.isArray(mixin.cases) && (typeof mixin.generate === 'function');
}

export function applyMixins(TestClass, ...mixins) {
  mixins.forEach(mixinOrGenerator => {
    let mixin;

    if (isGenerator(mixinOrGenerator)) {
      let generator = mixinOrGenerator;
      mixin = {};

      generator.cases.forEach(value => {
        assign(mixin, generator.generate(value));
      });
    } else {
      mixin = mixinOrGenerator;
    }

    assign(TestClass.prototype, mixin);
  });

  return TestClass;
}

export function moduleFor(description, TestClass, ...mixins) {
  let context;

  let modulePackagePrefixMatch = description.match(/^@(\w*)/); //eg '@glimmer' or '@htmlbars'
  let modulePackagePrefix = modulePackagePrefixMatch ? modulePackagePrefixMatch[1] : '';
  let descriptionWithoutPackagePrefix = description.replace(/^@\w* /, '');

  QUnit.module(`[${packageName}] ${descriptionWithoutPackagePrefix}`, {
    setup() {
      context = new TestClass();
    },

    teardown() {
      context.teardown();
    }
  });

  applyMixins(TestClass, mixins);

  let proto = TestClass.prototype;

  while (proto !== Object.prototype) {
    Object.keys(proto).forEach(generateTest);
    proto = Object.getPrototypeOf(proto);
  }

  function generateTest(name) {
    if (modulePackagePrefix && packageName !== modulePackagePrefix) {
      return;
    }

    if (name.indexOf('@test ') === 0) {
      QUnit.test(name.slice(5), assert => context[name](assert));
    } else if (name.indexOf('@skip ') === 0) {
      QUnit.skip(name.slice(5), assert => context[name](assert));
    } else if (name.indexOf(packageTag) === 0) {
      QUnit.test(name.slice(packageTag.length), assert => context[name](assert));
    }
  }
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
    let owner = this.owner = buildOwner();
    let env = this.env = new Environment({ dom, owner });
    this.renderer = new Renderer(dom, { destinedForDOM: true, env });
    this.element = jQuery('#qunit-fixture')[0];
    this.component = null;
    this.snapshot = null;
  }

  teardown() {
    if (this.component) {
      runDestroy(this.component);
      runDestroy(this.owner);
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

  $(sel) {
    return sel ? jQuery(sel, this.element) : jQuery(this.element);
  }

  takeSnapshot() {
    let snapshot = this.snapshot = [];

    let node = this.element.firstChild;

    while (node) {
      if (!isMarker(node)) {
        snapshot.push(node);
      }

      node = node.nextSibling;
    }

    return snapshot;
  }

  render(templateStr, context = {}) {
    let { renderer, owner } = this;

    owner.register('template:-top-level', compile(templateStr));

    let attrs = assign({}, context, {
      tagName: '',
      [OWNER]: owner,
      renderer,
      template: owner.lookup('template:-top-level')
    });

    this.component = Component.create(attrs);

    runAppend(this.component);
  }

  rerender() {
    this.component.rerender();
  }

  runTask(callback) {
    run(callback);
  }

  registerHelper(name, funcOrClassBody) {
    let type = typeof funcOrClassBody;

    if (type === 'function') {
      this.owner.register(`helper:${name}`, helper(funcOrClassBody));
    } else if (type === 'object' && type !== null) {
      this.owner.register(`helper:${name}`, Helper.extend(funcOrClassBody));
    } else {
      throw new Error(`Cannot register ${funcOrClassBody} as a helper`);
    }
  }

  registerComponent(name, { ComponentClass = null, template = null }) {
    let { owner, env } = this;

    if (ComponentClass) {
      owner.register(`component:${name}`, ComponentClass);
    }

    if (typeof template === 'string') {
      owner.register(`template:components/${name}`, compile(template, { env }));
    }
  }

  textValue() {
    return this.$().text();
  }

  assertText(text) {
    assert.strictEqual(this.textValue(), text, '#qunit-fixture content');
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

  assertElement(node, { ElementType = HTMLElement, tagName, attrs = null, content = null }) {
    if (!(node instanceof ElementType)) {
      throw new Error(`Expecting a ${ElementType.name}, but got ${node}`);
    }

    equalsElement(node, tagName, attrs, content);
  }

  assertComponentElement(node, { ElementType = HTMLElement, tagName = 'div', attrs = null, content = null }) {
    attrs = assign({}, { id: regex(/^ember\d*$/), class: classes('ember-view') }, attrs || {});
    this.assertElement(node, { ElementType, tagName, attrs, content });
  }

  assertSameNode(actual, expected) {
    assert.strictEqual(actual, expected, 'DOM node stability');
  }

  assertInvariants() {
    let oldSnapshot = this.snapshot;
    let newSnapshot = this.takeSnapshot();

    assert.strictEqual(newSnapshot.length, oldSnapshot.length, 'Same number of nodes');

    for (let i = 0; i < oldSnapshot.length; i++) {
      this.assertSameNode(newSnapshot[i], oldSnapshot[i]);
    }
  }
}

export function strip(str) {
  return str.split('\n').map(s => s.trim()).join('');
}
