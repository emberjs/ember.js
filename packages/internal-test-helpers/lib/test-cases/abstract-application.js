import { run } from 'ember-metal';
import { jQuery } from 'ember-views';
import { Application } from 'ember-application';
import { Router } from 'ember-routing';
import { compile } from 'ember-template-compiler';

import AbstractTestCase from './abstract';
import { ModuleBasedResolver } from '../test-resolver';
import { runDestroy } from '../run';

export default class AbstractApplicationTestCase extends AbstractTestCase {
  constructor() {
    super();

    this.element = jQuery('#qunit-fixture')[0];

    let { applicationOptions } = this;
    this.application = run(Application, 'create', applicationOptions);

    this.resolver = applicationOptions.Resolver.lastInstance;

    if (this.resolver) {
      this.resolver.add('router:main', Router.extend(this.routerOptions));
    }

    this.applicationInstance = null;
  }

  get applicationOptions() {
    return {
      rootElement: '#qunit-fixture',
      autoboot: false,
      Resolver: ModuleBasedResolver
    };
  }

  get routerOptions() {
    return {
      location: 'none'
    };
  }

  get router() {
    return this.application.resolveRegistration('router:main');
  }

  get appRouter() {
    return this.applicationInstance.lookup('router:main');
  }

  teardown() {
    runDestroy(this.applicationInstance);
    runDestroy(this.application);
  }

  visit(url, options) {
    let { applicationInstance } = this;

    if (applicationInstance) {
      return this.runTask(() => applicationInstance.visit(url, options));
    } else {
      return this.runTask(() => {
        return this.application.visit(url, options).then(instance => {
          this.applicationInstance = instance;
        });
      });
    }
  }

  transitionTo() {
    return run(this.appRouter, 'transitionTo', ...arguments);
  }

  compile(string, options) {
    return compile(...arguments);
  }

  add(specifier, factory) {
    this.resolver.add(specifier, factory);
  }

  addTemplate(templateName, templateString) {
    this.resolver.add(`template:${templateName}`, this.compile(templateString, {
      moduleName: templateName
    }));
  }

  addComponent(name, { ComponentClass = null, template = null }) {
    if (ComponentClass) {
      this.resolver.add(`component:${name}`, ComponentClass);
    }

    if (typeof template === 'string') {
      this.resolver.add(`template:components/${name}`, this.compile(template, {
        moduleName: `components/${name}`
      }));
    }
  }

}
