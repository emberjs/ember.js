import TestResolverApplicationTestCase from './test-resolver-application';
import Application from '@ember/application';
import { assign } from '@ember/polyfills';
import { Router } from '@ember/-internals/routing';

export default class AutobootApplicationTestCase extends TestResolverApplicationTestCase {
  createApplication(options, MyApplication = Application) {
    let myOptions = assign(this.applicationOptions, options);
    let application = (this.application = MyApplication.create(myOptions));
    this.resolver = application.__registry__.resolver;

    if (this.resolver) {
      let { routerOptions } = this;
      let RouterSubclass =
        typeof routerOptions === 'function' ? routerOptions : Router.extend(routerOptions);
      this.resolver.add('router:main', RouterSubclass);
    }

    return application;
  }

  visit(url) {
    return this.application.boot().then(() => {
      return this.applicationInstance.visit(url);
    });
  }

  get applicationInstance() {
    let { application } = this;

    if (!application) {
      return undefined;
    }

    return application.__deprecatedInstance__;
  }
}
