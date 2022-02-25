import TestResolverApplicationTestCase from './test-resolver-application';
import Application from '@ember/application';
import { Router } from '@ember/-internals/routing';

import { runTask, runLoopSettled } from '../run';
import Resolver from '../test-resolver';
import { assert as emberAssert } from '@ember/debug';
import Controller from '@ember/controller';
import ApplicationInstance from '@ember/application/instance';

export default abstract class ApplicationTestCase extends TestResolverApplicationTestCase {
  application: Application;
  applicationInstance?: ApplicationInstance;
  resolver: Resolver;

  constructor(assert: QUnit['assert']) {
    super(assert);

    let { applicationOptions } = this;
    this.application = runTask(this.createApplication.bind(this, applicationOptions));

    // TODO: Review this cast
    let resolver = this.application.__registry__.resolver;
    emberAssert('expected a resolver', resolver instanceof Resolver);
    this.resolver = resolver;

    resolver.add('router:main', Router.extend(this.routerOptions));
  }

  createApplication(myOptions = {}, MyApplication = Application) {
    return MyApplication.create(myOptions);
  }

  get applicationOptions() {
    return Object.assign(super.applicationOptions, {
      autoboot: false,
    });
  }

  get appRouter() {
    return this.applicationInstance!.lookup('router:main') as Router;
  }

  get currentURL() {
    return this.appRouter.get('currentURL');
  }

  async transitionTo() {
    await this.appRouter.transitionTo(...arguments);
    await runLoopSettled();
  }

  controllerFor(name: string) {
    return this.applicationInstance!.lookup(`controller:${name}`) as Controller | undefined;
  }
}
