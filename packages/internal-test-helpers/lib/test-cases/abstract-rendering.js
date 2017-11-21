import { assign } from 'ember-utils';
import { compile } from 'ember-template-compiler';
import { jQuery, EventDispatcher } from 'ember-views';
import { helper, Helper, Component, _resetRenderers} from 'ember-glimmer';

import AbstractTestCase from './abstract';
import buildOwner from '../build-owner';
import { runAppend, runDestroy } from '../run';

const TextNode = window.Text;

export default class AbstractRenderingTestCase extends AbstractTestCase {
  constructor() {
    super();
    let bootOptions = this.getBootOptions();

    let owner = this.owner = buildOwner({
      ownerOptions: this.getOwnerOptions(),
      resolver: this.getResolver(),
      bootOptions,
    });

    this.renderer = this.owner.lookup('renderer:-dom');
    this.element = jQuery('#qunit-fixture')[0];
    this.component = null;

    owner.register('event_dispatcher:main', EventDispatcher);
    owner.inject('event_dispatcher:main', '_viewRegistry', '-view-registry:main');
    if (!bootOptions || bootOptions.isInteractive !== false) {
      owner.lookup('event_dispatcher:main').setup(this.getCustomDispatcherEvents(), this.element);
    }
  }

  compile() {
    return compile(...arguments);
  }

  getCustomDispatcherEvents() {
    return {};
  }

  getOwnerOptions() { }
  getBootOptions() { }
  getResolver() { }

  teardown() {
    try {
      if (this.component) {
        runDestroy(this.component);
      }
      if (this.owner) {
        runDestroy(this.owner);
      }
    } finally {
      _resetRenderers();
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
      owner.register(moduleName, this.compile(template, { moduleName }));
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
