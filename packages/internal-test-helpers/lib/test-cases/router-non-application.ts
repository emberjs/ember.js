import type { EmberPrecompileOptions } from 'ember-template-compiler';
import compile from '../compile';
import { EventDispatcher } from '@ember/-internals/views';
import type { Renderer } from '@ember/-internals/glimmer';
import { DynamicScope } from '@ember/-internals/glimmer/lib/renderer';
import { setComponentTemplate } from '@ember/component';
import { _resetRenderers, renderComponent, setRenderer } from '@ember/-internals/glimmer';
import type { SimpleElement } from '@simple-dom/interface';
import type Resolver from '../test-resolver';
import TopLevelComponent from '../top-level-component';
import { ModuleBasedResolver } from '../test-resolver';

import AbstractTestCase from './abstract';
import buildOwner from '../build-owner';
import { runDestroy, runTask } from '../run';
import type { BootOptions, EngineInstanceOptions } from '@ember/engine/instance';
import type EngineInstance from '@ember/engine/instance';
import type { InternalFactory } from '@ember/-internals/owner';

export default class RouterNonApplicationTestCase extends AbstractTestCase {
  owner: EngineInstance;
  renderer: Renderer;
  element: HTMLElement;
  component: any;
  root: object | null = null;

  constructor(assert: QUnit['assert']) {
    super(assert);
    let bootOptions = this.getBootOptions();

    let owner = (this.owner = buildOwner({
      ownerType: 'engine',
      ownerOptions: this.getOwnerOptions(),
      resolver: this.getResolver(),
      bootOptions,
    }));

    owner.register('-view-registry:main', Object.create(null), { instantiate: false });
    owner.register('event_dispatcher:main', EventDispatcher);

    // This is a bit of a hack, but we need to register an application instance
    // so that the router can look it up. In the future, we should probably
    // make this a real application instance, or at least a real engine instance.
    // `_setOutlets` renders the root outlet through `renderRootComponent`, so we
    // mirror `ApplicationInstance#renderRootComponent` (seed `renderer:-dom` as
    // the owner's renderer, then render into the fixture element).
    let appInstance = {
      renderRootComponent: (component: object) => {
        setRenderer(owner, this.renderer);
        renderComponent(component, {
          into: { element: this.element as unknown as SimpleElement, nextSibling: null },
          owner,
        });
      },
    };
    owner.register('-application-instance:main', appInstance, { instantiate: false });

    this.renderer = this.owner.lookup('renderer:-dom') as Renderer;
    this.element = document.querySelector('#qunit-fixture')!;
    this.component = null;
  }

  compile(templateString: string, options: Partial<EmberPrecompileOptions> = {}) {
    return compile(templateString, options);
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
      runDestroy(this.root);
      runDestroy(this.component);
      if (this.owner) {
        runDestroy(this.owner);
      }
    } finally {
      _resetRenderers();
    }
  }

  render(templateStr: string, context = {}) {
    let test = this;

    class Root extends TopLevelComponent {
      constructor(...args: ConstructorParameters<typeof TopLevelComponent>) {
        super(...args);

        Object.defineProperties(this, Object.getOwnPropertyDescriptors(context));
        test.component = this;
      }
    }

    setComponentTemplate(this.compile(templateStr, { moduleName: '-top-level' }), Root);

    this.root = runTask(() =>
      this.renderer.render(Root, {
        into: this.element as unknown as SimpleElement,
        /**
          The default scope of a component root does not pass `view` to its
          children, and classic components read `parentView` from there.
        */
        dynamicScope: DynamicScope.root(),
      })
    );
  }
}
