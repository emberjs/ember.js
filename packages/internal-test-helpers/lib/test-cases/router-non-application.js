import { assign } from '@ember/polyfills';
import { compile } from 'ember-template-compiler';
import { EventDispatcher } from '@ember/-internals/views';
import { Component, _resetRenderers } from '@ember/-internals/glimmer';
import { ModuleBasedResolver } from '../test-resolver';

import AbstractTestCase from './abstract';
import buildOwner from '../build-owner';
import { runAppend, runDestroy } from '../run';

export default class RouterNonApplicationTestCase extends AbstractTestCase {
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
    owner.inject('renderer', '_viewRegistry', '-view-registry:main');

    this.renderer = this.owner.lookup('renderer:-dom');
    this.element = document.querySelector('#qunit-fixture');
    this.component = null;
  }

  compile() {
    return compile(...arguments);
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
}
