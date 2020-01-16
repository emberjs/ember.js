import TestResolverApplicationTestCase from './test-resolver-application';
import Application from '@ember/application';
import { Router } from '@ember/-internals/routing';
import { assign } from '@ember/polyfills';

import { runTask, runLoopSettled } from '../run';

export default class ApplicationTestCase extends TestResolverApplicationTestCase {
  constructor() {
    super(...arguments);

    let { applicationOptions } = this;
    this.application = runTask(this.createApplication.bind(this, applicationOptions));

    this.resolver = this.application.__registry__.resolver;

    if (this.resolver) {
      this.resolver.add('router:main', Router.extend(this.routerOptions));
    }
  }

  createApplication(myOptions = {}, MyApplication = Application) {
    return MyApplication.create(myOptions);
  }

  get applicationOptions() {
    return assign(super.applicationOptions, {
      autoboot: false,
    });
  }

  get appRouter() {
    return this.applicationInstance.lookup('router:main');
  }

  get currentURL() {
    return this.appRouter.get('currentURL');
  }

  async transitionTo() {
    await this.appRouter.transitionTo(...arguments);
    await runLoopSettled();
  }

  controllerFor(name) {
    return this.applicationInstance.lookup(`controller:${name}`);
  }
}
