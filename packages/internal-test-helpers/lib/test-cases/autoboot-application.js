import TestResolverApplicationTestCase from './test-resolver-application';
import { Application } from 'ember-application';
import { assign } from 'ember-utils';
import { Router } from 'ember-routing';

export default class AutobootApplicationTestCase extends TestResolverApplicationTestCase {

  createApplication(options, MyApplication=Application) {
    let myOptions = assign(this.applicationOptions, options);
    let application = this.application = MyApplication.create(myOptions);
    this.resolver = myOptions.Resolver.lastInstance;

    if (this.resolver) {
      this.resolver.add('router:main', Router.extend(this.routerOptions));
    }

    return application;
  }

  visit(url) {
    return this.application.boot()
      .then(() => {
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
