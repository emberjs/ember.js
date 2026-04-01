import type { Renderer } from '@ember/-internals/glimmer';
import { _resetRenderers, helper, Helper } from '@ember/-internals/glimmer';
import { EventDispatcher } from '@ember/-internals/views';
import Component from '@ember/component';
import type { EmberPrecompileOptions } from 'ember-template-compiler';
import compile from '../compile';
import type Resolver from '../test-resolver';
import { ModuleBasedResolver } from '../test-resolver';

import type { InternalFactory } from '@ember/-internals/owner';
import type EngineInstance from '@ember/engine/instance';
import type { BootOptions, EngineInstanceOptions } from '@ember/engine/instance';
import buildOwner from '../build-owner';
import { define } from '../module-for';
import { runAppend, runDestroy, runTask } from '../run';
import AbstractTestCase from './abstract';

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

  add(specifier: string, factory: InternalFactory<object> | object) {
    this.resolver.add(specifier, factory);
  }

  afterEach() {
    try {
      // Clean up GXT active components first (if using GXT)
      const gxtCleanup = (globalThis as any).__gxtCleanupActiveComponents;
      if (typeof gxtCleanup === 'function') {
        gxtCleanup();
      }
      // Ensure no pending GXT syncs leak between tests
      (globalThis as any).__gxtSyncScheduled = false;

      if (this.component) {
        runDestroy(this.component);
      }
      if (this.owner) {
        runDestroy(this.owner);
      }
      // Clear stale globalThis.owner so subsequent tests don't see a destroyed owner
      if ((globalThis as any).owner?.isDestroyed || (globalThis as any).owner?.isDestroying) {
        (globalThis as any).owner = null;
      }
    } finally {
      _resetRenderers();
      // Reset pending sync AFTER destroy — destroy triggers notifyPropertyChange
      // which sets __gxtPendingSync = true. Without this, a setInterval timer
      // fires __gxtSyncDomNow() during the next test's initialization.
      (globalThis as any).__gxtPendingSync = false;
      (globalThis as any).__gxtPendingSyncFromPropertyChange = false;
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

    // Increment render pass ID before starting a new render transaction
    // This ensures all components in this render share the same pass ID
    (globalThis as any).__emberRenderPassId = ((globalThis as any).__emberRenderPassId || 0) + 1;

    runAppend(this.component);
  }

  renderComponent(component: object, options: { expect: string }) {
    this.owner.register('component:root', component);
    this.render('<Root />');
    this.assertHTML(options.expect);
    this.assertStableRerender();
  }

  rerender() {
    this.#assertNotAwaiting('rerender');
    // Increment render pass ID for re-renders too
    (globalThis as any).__emberRenderPassId = ((globalThis as any).__emberRenderPassId || 0) + 1;
    this.component!.rerender();
  }

  registerHelper<T, P extends unknown[], N extends Record<string, unknown>>(
    name: string,
    funcOrClassBody: (positional: P, named: N) => T | Record<string, unknown>
  ) {
    if (typeof funcOrClassBody === 'function') {
      this.owner.register(`helper:${name}`, helper(funcOrClassBody));
    } else if (typeof funcOrClassBody === 'object' && funcOrClassBody !== null) {
      this.owner.register(`helper:${name}`, Helper.extend(funcOrClassBody));
    } else {
      throw new Error(`Cannot register ${funcOrClassBody} as a helper`);
    }
  }

  registerCustomHelper(name: string, definition: InternalFactory<object>) {
    this.owner.register(`helper:${name}`, definition);
  }

  #awaiting = false;

  #assertNotAwaiting(from: string) {
    if (this.#awaiting) {
      throw new Error(
        `Cannot call '${from}' while awaiting a component module. Make sure to await 'this.renderComponentModule()'`
      );
    }
  }

  override assertHTML(html: string): void {
    this.#assertNotAwaiting('assertHTML');
    super.assertHTML(html);
  }

  async renderComponentModule<T extends object>(callback: () => T): Promise<void> {
    let { owner } = this;

    this.#awaiting = true;
    let component = await define(callback);
    this.#awaiting = false;

    owner.register(`component:test-component`, component);

    this.render(`<TestComponent />`, component);
  }

  async registerComponentModule<T extends object>(name: string, callback: () => T): Promise<T> {
    let { owner } = this;
    let component = await define(callback);

    owner.register(`component:${name}`, component);

    return component;
  }

  registerModifier(name: string, ModifierClass: InternalFactory<object>) {
    let { owner } = this;

    owner.register(`modifier:${name}`, ModifierClass);
  }

  registerComponentManager(name: string, manager: InternalFactory<object>) {
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

  registerService(name: string, klass: InternalFactory<object>) {
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
