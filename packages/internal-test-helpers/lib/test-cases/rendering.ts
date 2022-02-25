import { compile, EmberPrecompileOptions } from 'ember-template-compiler';
import { EventDispatcher } from '@ember/-internals/views';
import { helper, Helper, Component, _resetRenderers, Renderer } from '@ember/-internals/glimmer';
import Resolver, { ModuleBasedResolver } from '../test-resolver';

import AbstractTestCase from './abstract';
import buildOwner from '../build-owner';
import { runAppend, runDestroy, runTask } from '../run';
import { Factory } from '@ember/-internals/owner';
import { BootOptions } from '@ember/application/instance';
import EngineInstance, { EngineInstanceOptions } from '@ember/engine/instance';
import { HelperFunction } from '@ember/-internals/glimmer/lib/helper';

const TextNode = window.Text;

export default abstract class RenderingTestCase extends AbstractTestCase {
  owner: EngineInstance;
  renderer: Renderer;
  element: HTMLElement;
  component: any;

  constructor(assert: QUnit['assert']) {
    super(assert);
    let bootOptions = this.getBootOptions();

    let owner = (this.owner = buildOwner({
      ownerOptions: this.getOwnerOptions(),
      resolver: this.getResolver(),
      bootOptions,
    }));

    owner.register('-view-registry:main', Object.create(null), { instantiate: false });
    owner.register('event_dispatcher:main', EventDispatcher);

    this.renderer = this.owner.lookup('renderer:-dom') as Renderer;
    this.element = document.querySelector('#qunit-fixture')!;
    this.component = null;

    if (
      !bootOptions ||
      (bootOptions.isInteractive !== false && bootOptions.skipEventDispatcher !== true)
    ) {
      (owner.lookup('event_dispatcher:main') as EventDispatcher).setup(
        this.getCustomDispatcherEvents(),
        this.element
      );
    }
  }

  compile(templateString: string, options: Partial<EmberPrecompileOptions> = {}) {
    return compile(templateString, options);
  }

  getCustomDispatcherEvents() {
    return {};
  }

  getOwnerOptions(): EngineInstanceOptions | undefined {
    return undefined;
  }

  getBootOptions(): (BootOptions & { skipEventDispatcher?: boolean }) | undefined {
    return undefined;
  }

  get resolver(): Resolver {
    return (this.owner.__registry__.fallback as any).resolver;
  }

  getResolver() {
    return new ModuleBasedResolver();
  }

  add(specifier: string, factory: unknown) {
    this.resolver.add(specifier, factory);
  }

  addTemplate(
    templateName:
      | string
      | { specifier: string; source: unknown; namespace: unknown; moduleName: string },
    templateString: string
  ) {
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

  addComponent(name: string, { ComponentClass = null, template = null }) {
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

  render(templateStr: string, context = {}) {
    let { owner } = this;

    owner.register(
      'template:-top-level',
      this.compile(templateStr, {
        moduleName: '-top-level',
      })
    );

    let attrs = Object.assign({}, context, {
      tagName: '',
      layoutName: '-top-level',
    });

    owner.register('component:-top-level', Component.extend(attrs));

    this.component = owner.lookup('component:-top-level');

    runAppend(this.component);
  }

  rerender() {
    this.component!.rerender();
  }

  registerHelper<T, P extends unknown[], N extends Record<string, unknown>>(
    name: string,
    funcOrClassBody: HelperFunction<T, P, N> | Record<string, unknown>
  ) {
    if (typeof funcOrClassBody === 'function') {
      this.owner.register(`helper:${name}`, helper(funcOrClassBody));
    } else if (typeof funcOrClassBody === 'object' && funcOrClassBody !== null) {
      this.owner.register(`helper:${name}`, Helper.extend(funcOrClassBody));
    } else {
      throw new Error(`Cannot register ${funcOrClassBody} as a helper`);
    }
  }

  registerCustomHelper(name: string, definition: Factory<unknown>) {
    this.owner.register(`helper:${name}`, definition);
  }

  registerComponent(name: string, { ComponentClass = Component, template = null }) {
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

  registerModifier(name: string, ModifierClass: Factory<unknown>) {
    let { owner } = this;

    owner.register(`modifier:${name}`, ModifierClass);
  }

  registerComponentManager(name: string, manager: Factory<unknown>) {
    let owner = this.owner;
    owner.register(`component-manager:${name}`, manager);
  }

  registerTemplate(name: string, template: string) {
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

  registerService(name: string, klass: Factory<unknown>) {
    this.owner.register(`service:${name}`, klass);
  }

  assertTextNode(node: Node, text: string) {
    if (!(node instanceof TextNode)) {
      throw new Error(`Expecting a text node, but got ${node}`);
    }

    this.assert.strictEqual(node.textContent, text, 'node.textContent');
  }

  assertStableRerender() {
    this.takeSnapshot();
    runTask(() => this.rerender());
    this.assertInvariants();
  }
}
