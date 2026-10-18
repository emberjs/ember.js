// gxt NATIVE layer — test support: alias target for
// `internal-test-helpers/lib/test-cases/rendering` on the native test page
// (native.html; scripts/gxt-alias-map.mjs). Never part of an app closure.
//
// The classic RenderingTestCase renders `this.render('<template string>', ctx)`
// as a classic `@ember/component` (`Component.extend(ctx)`, tagName '') appended
// by the classic renderer — both dropped in native. Here the same API renders
// natively:
//   - the template string is runtime-compiled LOOSE under NATIVE_FLAGS
//     (native/runtime-compile.ts): `this` paths read the template SELF
//     (EMBER_SELF) and every member segment is a property-tag read
//     (EMBER_PROPERTY_TAGS);
//   - the self (`this.context`) is an EmberObject built from the context hash
//     (`EmberObject.extend(ctx)` — the classic `Component.extend(ctx)` minus the
//     view layer), so `set(this.context, 'a.b', …)` re-renders like Glimmer;
//   - it renders as one native root (renderer.ts `renderRoot`: owner context,
//     render transaction, modifier commit) through `selfComponent`: a fresh gxt
//     render node carries the self, so gxt writes nothing onto the context;
//   - teardown destroys the root, the context and the owner (destroyables).
// Everything else (owner/registry helpers, assertions, snapshots) keeps the
// classic API so the classic test modules run unchanged.
import type { InternalFactory } from '@ember/-internals/owner';
import { EventDispatcher } from '@ember/-internals/views';
import { helper, Helper } from '@ember/-internals/glimmer';
import type EngineInstance from '@ember/engine/instance';
import type { BootOptions, EngineInstanceOptions } from '@ember/engine/instance';
import EmberObject from '@ember/object';
import { registerDestructor } from '@ember/destroyable';
import { run } from '@ember/runloop';
import buildOwner from 'internal-test-helpers/lib/build-owner';
import { define } from 'internal-test-helpers/lib/module-for';
import { runDestroy, runTask } from 'internal-test-helpers/lib/run';
import AbstractTestCase from 'internal-test-helpers/lib/test-cases/abstract';
import type Resolver from 'internal-test-helpers/lib/test-resolver';
import { ModuleBasedResolver } from 'internal-test-helpers/lib/test-resolver';
import { _resetRenderers, renderRoot, type NativeRenderRoot, type Renderer } from '../renderer';
import compile from '../runtime-compile';
import { selfComponent, type NativeTemplateFactory } from '../template-factory';

const TextNode = window.Text;

export default abstract class RenderingTestCase extends AbstractTestCase {
  owner: EngineInstance;
  renderer: Renderer;
  element: HTMLElement;
  /** The render self (classic: the `-top-level` component); `this.context`. */
  component: any;
  #root: NativeRenderRoot | null = null;

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

  compile(templateString: string, options: Record<string, unknown> = {}): NativeTemplateFactory {
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
      const root = this.#root;
      this.#root = null;
      if (root !== null) run(() => root.destroy());
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

  render(templateStr: string, context: Record<string, unknown> = {}) {
    let { owner } = this;

    const factory = this.compile(templateStr, { moduleName: '-top-level' });
    owner.register('template:-top-level', factory);
    // Own enumerable properties only (classic RenderingTestCase copies the
    // context with Object.assign — `renderComponentModule` passes a class).
    owner.register('-test-context:-top-level', EmberObject.extend(Object.assign({}, context)));
    this.component = owner.lookup('-test-context:-top-level');

    const template = factory(owner);
    const bootOptions = this.getBootOptions();
    run(() => {
      const root = renderRoot(selfComponent(template, this.component), {
        owner,
        parent: this.element,
        interactive: bootOptions?.isInteractive !== false,
      });
      this.#root = root;
      // classic: the context IS the `-top-level` component that owns the
      // render — destroying it (`runDestroy(this.component)`) tears the
      // rendered tree down (helpers / modifiers / components destroyed).
      registerDestructor(this.component, () => {
        if (this.#root === root) {
          this.#root = null;
          root.destroy();
        }
      });
    });
  }

  renderComponent(component: object, options: { expect: string }) {
    this.owner.register('component:root', component);
    this.render('<Root />');
    this.assertHTML(options.expect);
    this.assertStableRerender();
  }

  rerender() {
    this.#assertNotAwaiting('rerender');
    // classic: `component.rerender()` — a render pass over whatever is stale.
    this.renderer.rerender();
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

    this.render(`<TestComponent />`, component as unknown as Record<string, unknown>);
  }

  async registerComponentModule<T extends object>(name: string, callback: () => T): Promise<T> {
    let { owner } = this;
    let component = await define(callback);

    owner.register(`component:${name}`, component);

    return component;
  }

  registerModifier(name: string, ModifierClass: InternalFactory<object>) {
    this.owner.register(`modifier:${name}`, ModifierClass);
  }

  registerComponentManager(name: string, manager: InternalFactory<object>) {
    this.owner.register(`component-manager:${name}`, manager);
  }

  registerTemplate(name: string, template: string) {
    if (typeof template === 'string') {
      this.owner.register(
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
