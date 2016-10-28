import { run } from 'ember-metal';
import { jQuery } from 'ember-views';
import { Application } from 'ember-application';
import { Router } from 'ember-routing';
import { compile } from 'ember-template-compiler';

import AbstractTestCase from './abstract';
import { runDestroy } from '../run';

export default class AbstractApplicationTestCase extends AbstractTestCase {
  constructor() {
    super();

    this.element = jQuery('#qunit-fixture')[0];

    this.application = run(Application, 'create', this.applicationOptions);

    this.router = this.application.Router = Router.extend(this.routerOptions);

    this.applicationInstance = null;
  }

  get applicationOptions() {
    return {
      rootElement: '#qunit-fixture',
      autoboot: false
    };
  }

  get routerOptions() {
    return {
      location: 'none'
    };
  }

  get appRouter() {
    return this.applicationInstance.lookup('router:main');
  }

  teardown() {
    if (this.applicationInstance) {
      runDestroy(this.applicationInstance);
    }

    runDestroy(this.application);
  }

  visit(url, options) {
    let { applicationInstance } = this;

    if (applicationInstance) {
      return run(applicationInstance, 'visit', url, options);
    } else {
      return run(this.application, 'visit', url, options).then(instance => {
        this.applicationInstance = instance;
      });
    }
  }

  transitionTo() {
    return run(this.appRouter, 'transitionTo', ...arguments);
  }

  compile(string, options) {
    return compile(...arguments);
  }

  registerRoute(name, route) {
    this.application.register(`route:${name}`, route);
  }

  registerTemplate(name, template) {
    this.application.register(`template:${name}`, this.compile(template, {
      moduleName: name
    }));
  }

  registerComponent(name, { ComponentClass = null, template = null }) {
    if (ComponentClass) {
      this.application.register(`component:${name}`, ComponentClass);
    }

    if (typeof template === 'string') {
      this.application.register(`template:components/${name}`, this.compile(template, {
        moduleName: `components/${name}`
      }));
    }
  }

  registerController(name, controller) {
    this.application.register(`controller:${name}`, controller);
  }

  registerEngine(name, engine) {
    this.application.register(`engine:${name}`, engine);
  }
}
