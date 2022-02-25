import TestResolverApplicationTestCase from './test-resolver-application';
import Application from '@ember/application';
import { Router } from '@ember/-internals/routing';
import Resolver from '../test-resolver';
import { assert } from '@ember/debug';
import ApplicationInstance from '@ember/application/instance';

export default abstract class AutobootApplicationTestCase extends TestResolverApplicationTestCase {
  resolver?: Resolver;

  createApplication(options: object, MyApplication = Application) {
    let myOptions = Object.assign(this.applicationOptions, options);
    let application = (this.application = MyApplication.create(myOptions));
    let resolver = application.__registry__.resolver;
    assert('expected a resolver', resolver instanceof Resolver);
    this.resolver = resolver;

    resolver.add('router:main', Router.extend(this.routerOptions));

    return application;
  }

  visit(url: string) {
    return this.application.boot().then(() => {
      return this.applicationInstance!.visit(url);
    });
  }

  get applicationInstance(): ApplicationInstance | undefined {
    let { application } = this;

    if (!application) {
      return undefined;
    }

    return application.__deprecatedInstance__;
  }
}
