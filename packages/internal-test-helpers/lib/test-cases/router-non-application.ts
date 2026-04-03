import compile from '../compile';
import { template } from '@ember/template-compiler/runtime';
import { EventDispatcher } from '@ember/-internals/views';
import type { Renderer } from '@ember/-internals/glimmer';
import { _resetRenderers, renderComponent } from '@ember/-internals/glimmer';
import type Resolver from '../test-resolver';
import { ModuleBasedResolver } from '../test-resolver';

import AbstractTestCase from './abstract';
import buildOwner from '../build-owner';
import { runDestroy } from '../run';
import type { BootOptions, EngineInstanceOptions } from '@ember/engine/instance';
import type EngineInstance from '@ember/engine/instance';
import type { InternalFactory } from '@ember/-internals/owner';

export default class RouterNonApplicationTestCase extends AbstractTestCase {
  owner: EngineInstance;
  renderer: Renderer;
  element: HTMLElement;
  component: any;

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
    let appInstance = {
      didCreateRootView: (view: any) => {
        view.appendTo(this.element);
      },
    };
    owner.register('-application-instance:main', appInstance, { instantiate: false });

    this.renderer = this.owner.lookup('renderer:-dom') as Renderer;
    this.element = document.querySelector('#qunit-fixture')!;
    this.component = null;
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
        compile(templateString, {
          moduleName: templateName,
        })
      );
    } else {
      this.resolver.add(
        templateName,
        compile(templateString, {
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
        compile(template, {
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

  render(templateStr: string) {
    let TopLevel = template(templateStr, { strictMode: false });

    renderComponent(TopLevel, { into: this.element, owner: this.owner });
  }
}
