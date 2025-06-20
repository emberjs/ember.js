import TestResolverApplicationTestCase from './test-resolver-application';
import Application from '@ember/application';
import { get } from '@ember/object';
import Router from '@ember/routing/router';

import { runTask, runLoopSettled } from '../run';
import Resolver from '../test-resolver';
import { assert as emberAssert } from '@ember/debug';
import type Controller from '@ember/controller';
import type ApplicationInstance from '@ember/application/instance';

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

    let routerClass = class extends Router {};
    for (const [key, value] of Object.entries(this.routerOptions)) {
      routerClass = class extends routerClass {
        // @ts-expect-error This is not guaranteed safe
        [key] = value;
      };
    }
    resolver.add('router:main', routerClass);
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
    return get(this.appRouter, 'currentURL');
  }

  async transitionTo() {
    await this.appRouter.transitionTo(...arguments);
    await runLoopSettled();
  }

  controllerFor(name: string) {
    return this.applicationInstance!.lookup(`controller:${name}`) as Controller | undefined;
  }
}
