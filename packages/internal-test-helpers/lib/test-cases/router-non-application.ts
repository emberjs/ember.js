import { compile, EmberPrecompileOptions } from 'ember-template-compiler';
import { EventDispatcher } from '@ember/-internals/views';
import { Component, Renderer, _resetRenderers } from '@ember/-internals/glimmer';
import Resolver, { ModuleBasedResolver } from '../test-resolver';

import AbstractTestCase from './abstract';
import buildOwner from '../build-owner';
import { runAppend, runDestroy } from '../run';
import EngineInstance, { EngineInstanceOptions } from '@ember/engine/instance';
import { BootOptions } from '@ember/application/instance';

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
}
