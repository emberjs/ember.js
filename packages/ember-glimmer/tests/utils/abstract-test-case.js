import packageName from './package-name';
import { compile, helper, Helper, Component } from './helpers';
import { equalsElement, equalTokens, regex, classes, equalInnerHTML } from './test-helpers';
import run from 'ember-metal/run_loop';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import jQuery from 'ember-views/system/jquery';
import assign from 'ember-metal/assign';
import Application from 'ember-application/system/application';
import Router from 'ember-routing/system/router';
import isEnabled from 'ember-metal/features';
import EventDispatcher from 'ember-views/system/event_dispatcher';
import require from 'require';
import { buildOwner } from './helpers';

const packageTag = `@${packageName} `;

let PartialDefinition;
if (packageName === 'glimmer') {
  PartialDefinition = require('glimmer-runtime').PartialDefinition;
}

function isGenerator(mixin) {
  return Array.isArray(mixin.cases) && (typeof mixin.generate === 'function');
}

export function applyMixins(TestClass, ...mixins) {
  mixins.forEach(mixinOrGenerator => {
    let mixin;

    if (isGenerator(mixinOrGenerator)) {
      let generator = mixinOrGenerator;
      mixin = {};

      generator.cases.forEach((value, idx) => {
        assign(mixin, generator.generate(value, idx));
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

  if (isEnabled('ember-glimmer') && packageName === 'htmlbars') {
    // disable htmlbars tests when running with the ember-glimmer feature enabled
    return;
  }

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
      QUnit.skip(`SKIPPED IN ${packageName.toUpperCase()} ${name.slice(5)}`, assert => context[name](assert));
    } else if (name.indexOf('@test ') === 0) {
      QUnit.test(name.slice(5), assert => context[name](assert));
    } else if (name.indexOf('@skip ') === 0) {
      QUnit.skip(name.slice(5), assert => context[name](assert));
    } else if (name.indexOf(packageTag) === 0) {
      QUnit.test(name.slice(packageTag.length), assert => context[name](assert));
    }
  }
}

const TextNode = window.Text;
const HTMLElement = window.HTMLElement;
const Comment = window.Comment;

export class TestCase {
  constructor() {
    this.element = null;
    this.snapshot = null;
    this.assert = QUnit.config.current.assert;
  }

  get isHTMLBars() {
    return packageName === 'htmlbars';
  }

  get isGlimmer() {
    return packageName === 'glimmer';
  }

  teardown() {}

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
    return sel ? jQuery(sel, this.element) : jQuery(this.element);
  }

  textValue() {
    return this.$().text();
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

  assertText(text) {
    this.assert.strictEqual(this.textValue(), text, '#qunit-fixture content');
  }

  assertInnerHTML(html) {
    equalInnerHTML(this.element, html);
  }

  assertHTML(html) {
    equalTokens(this.element, html, '#qunit-fixture content');
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

function isMarker(node) {
  if (node instanceof Comment && node.textContent === '') {
    return true;
  }

  if (node instanceof TextNode && node.textContent === '') {
    return true;
  }

  return false;
}

export class AbstractApplicationTest extends TestCase {
  constructor() {
    super();

    this.element = jQuery('#qunit-fixture')[0];

    this.application = run(Application, 'create', this.applicationOptions);

    this.router = this.application.Router = Router.extend({
      location: 'none'
    });

    this.applicationInstance = null;
  }

  get applicationOptions() {
    return {
      rootElement: '#qunit-fixture',
      autoboot: false
    };
  }

  teardown() {
    if (this.applicationInstance) {
      runDestroy(this.applicationInstance);
    }

    runDestroy(this.application);
  }

  visit(url) {
    let { applicationInstance } = this;

    if (applicationInstance) {
      return run(applicationInstance, 'visit', url);
    } else {
      return run(this.application, 'visit', url).then(instance => {
        this.applicationInstance = instance;
      });
    }
  }

  compile(string, options) {
    return compile(...arguments);
  }

  registerRoute(name, route) {
    this.application.register(`route:${name}`, route);
  }

  registerTemplate(name, template) {
    this.application.register(`template:${name}`, this.compile(template, {
      moduleName: name
    }));
  }

  registerComponent(name, { ComponentClass = null, template = null }) {
    if (ComponentClass) {
      this.application.register(`component:${name}`, ComponentClass);
    }

    if (typeof template === 'string') {
      this.application.register(`template:components/${name}`, this.compile(template, {
        moduleName: `components/${name}`
      }));
    }
  }

  registerController(name, controller) {
    this.application.register(`controller:${name}`, controller);
  }
}

export class AbstractRenderingTest extends TestCase {
  constructor() {
    super();
    let owner = this.owner = buildOwner(this.getOwnerOptions());

    this.renderer = this.owner.lookup('renderer:-dom');
    this.element = jQuery('#qunit-fixture')[0];
    this.component = null;

    owner.register('event_dispatcher:main', EventDispatcher);
    owner.inject('event_dispatcher:main', '_viewRegistry', '-view-registry:main');
    owner.lookup('event_dispatcher:main').setup(this.getCustomDispatcherEvents(), this.element);
  }

  compile() {
    return compile(...arguments);
  }

  getCustomDispatcherEvents() {
    return {};
  }

  getOwnerOptions() {
    return {};
  }

  teardown() {
    if (this.component) {
      runDestroy(this.component);
    }
    if (this.owner) {
      runDestroy(this.owner);
    }
  }

  get context() {
    return this.component;
  }

  render(templateStr, context = {}) {
    let { owner } = this;

    owner.register('template:-top-level', this.compile(templateStr, {
      moduleName: '-top-level'
    }));

    let attrs = assign({}, context, {
      tagName: '',
      layoutName: '-top-level'
    });

    owner.register('component:-top-level', Component.extend(attrs));

    this.component = owner.lookup('component:-top-level');

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

  registerPartial(name, template) {
    let owner = this.env.owner || this.owner;
    if (typeof template === 'string') {
      let moduleName = `template:${name}`;
      if (isEnabled('ember-glimmer')) {
        let partial = new PartialDefinition(moduleName, this.compile(template, { moduleName, env: this.env }));
        owner.register(moduleName, partial.template);
      } else {
        owner.register(moduleName, this.compile(template, { moduleName }));
      }
    }
  }

  registerComponent(name, { ComponentClass = null, template = null }) {
    let { owner } = this;

    if (ComponentClass) {
      owner.register(`component:${name}`, ComponentClass);
    }

    if (typeof template === 'string') {
      owner.register(`template:components/${name}`, this.compile(template, {
        moduleName: `components/${name}`
      }));
    }
  }

  registerTemplate(name, template) {
    let { owner } = this;
    if (typeof template === 'string') {
      owner.register(`template:${name}`, this.compile(template, {
        moduleName: name
      }));
    } else {
      throw new Error(`Registered template "${name}" must be a string`);
    }
  }

  registerService(name, klass) {
    this.owner.register(`service:${name}`, klass);
  }

  assertTextNode(node, text) {
    if (!(node instanceof TextNode)) {
      throw new Error(`Expecting a text node, but got ${node}`);
    }

    this.assert.strictEqual(node.textContent, text, 'node.textContent');
  }
}

export function strip([...strings], ...values) {
  let str = strings.map((string, index) => {
    let interpolated = values[index];
    return string + (interpolated !== undefined ? interpolated : '');
  }).join('');
  return str.split('\n').map(s => s.trim()).join('');
}
