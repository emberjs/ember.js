import { assign } from '@ember/polyfills';
import { compile } from 'ember-template-compiler';
import { EventDispatcher } from '@ember/-internals/views';
import { helper, Helper, Component, _resetRenderers } from '@ember/-internals/glimmer';
import { ModuleBasedResolver } from '../test-resolver';

import AbstractTestCase from './abstract';
import buildOwner from '../build-owner';
import { runAppend, runDestroy } from '../run';

const TextNode = window.Text;

export default class AbstractRenderingTestCase extends AbstractTestCase {
  constructor() {
    super(...arguments);
    let bootOptions = this.getBootOptions();

    let owner = (this.owner = buildOwner({
      ownerOptions: this.getOwnerOptions(),
      resolver: this.getResolver(),
      bootOptions,
    }));

    owner.register('-view-registry:main', Object.create(null), { instantiate: false });
    owner.register('event_dispatcher:main', EventDispatcher);

    // TODO: why didn't buildOwner do this for us?
    owner.inject('view', '_viewRegistry', '-view-registry:main');
    owner.inject('renderer', '_viewRegistry', '-view-registry:main');

    this.renderer = this.owner.lookup('renderer:-dom');
    this.element = document.querySelector('#qunit-fixture');
    this.component = null;

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

  getOwnerOptions() {}
  getBootOptions() {}

  get resolver() {
    return this.owner.__registry__.fallback.resolver;
  }

  getResolver() {
    return new ModuleBasedResolver();
  }

  add(specifier, factory) {
    this.resolver.add(specifier, factory);
  }

  addTemplate(templateName, templateString) {
    if (typeof templateName === 'string') {
      this.resolver.add(
        `template:${templateName}`,
        this.compile(templateString, {
          moduleName: templateName,
        })
      );
    } else {
      this.resolver.add(
        templateName,
        this.compile(templateString, {
          moduleName: templateName.moduleName,
        })
      );
    }
  }

  addComponent(name, { ComponentClass = null, template = null }) {
    if (ComponentClass) {
      this.resolver.add(`component:${name}`, ComponentClass);
    }

    if (typeof template === 'string') {
      this.resolver.add(
        `template:components/${name}`,
        this.compile(template, {
          moduleName: `components/${name}`,
        })
      );
    }
  }

  afterEach() {
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

    owner.register(
      'template:-top-level',
      this.compile(templateStr, {
        moduleName: '-top-level',
      })
    );

    let attrs = assign({}, context, {
      tagName: '',
      layoutName: '-top-level',
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
    let owner = this.owner;
    if (typeof template === 'string') {
      owner.register(
        `template:${name}`,
        this.compile(template, { moduleName: `my-app/templates/-${name}.hbs` })
      );
    }
  }

  registerComponent(name, { ComponentClass = Component, template = null }) {
    let { owner } = this;

    if (ComponentClass) {
      owner.register(`component:${name}`, ComponentClass);
    }

    if (typeof template === 'string') {
      owner.register(
        `template:components/${name}`,
        this.compile(template, {
          moduleName: `my-app/templates/components/${name}.hbs`,
        })
      );
    }
  }

  registerModifier(name, ModifierClass) {
    let { owner } = this;

    owner.register(`modifier:${name}`, ModifierClass);
  }

  registerComponentManager(name, manager) {
    let owner = this.owner;
    owner.register(`component-manager:${name}`, manager);
  }

  registerTemplate(name, template) {
    let { owner } = this;
    if (typeof template === 'string') {
      owner.register(
        `template:${name}`,
        this.compile(template, {
          moduleName: `my-app/templates/${name}.hbs`,
        })
      );
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
