import TestResolverApplicationTestCase from './test-resolver-application';
import TestResolver from '../test-resolver';
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

  visit(url, options) {
    return this.runTask(() => {
      return this.applicationInstance.visit(url, options);
    });
  }

  get applicationInstance() {
    return this.application.__deprecatedInstance__;
  }

}
