import TestResolverApplicationTestCase from './test-resolver-application';
import { Application } from 'ember-application';
import { Router } from 'ember-routing';
import { assign } from 'ember-utils';
import { runDestroy } from '../run';

export default class ApplicationTestCase extends TestResolverApplicationTestCase {
  constructor() {
    super();

    let { applicationOptions } = this;
    this.application = this.runTask(() => this.createApplication(applicationOptions));

    this.resolver = applicationOptions.Resolver.lastInstance;

    if (this.resolver) {
      this.resolver.add('router:main', Router.extend(this.routerOptions));
    }
  }

  createApplication(myOptions={}, MyApplication=Application) {
    return MyApplication.create(myOptions);
  }

  get applicationOptions() {
    return assign(super.applicationOptions, {
      autoboot: false
    });
  }

  teardown() {
    runDestroy(this.applicationInstance);
    super.teardown();
  }

  visit(url, options) {
    let { applicationInstance } = this;

    if (applicationInstance) {
      return this.runTask(() => applicationInstance.visit(url, options));
    } else {
      return this.runTask(() => {
        return this.application.visit(url, options).then(instance => {
          this.applicationInstance = instance;
          return instance;
        });
      });
    }
  }

  get appRouter() {
    return this.applicationInstance.lookup('router:main');
  }

  transitionTo() {
    return this.runTask(() =>{
      return this.appRouter.transitionTo(...arguments);
    });
  }

}
