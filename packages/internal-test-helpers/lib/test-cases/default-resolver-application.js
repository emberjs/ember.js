import AbstractApplicationTestCase from './abstract-application';
import DefaultResolver from '@ember/application/globals-resolver';
import Application from '@ember/application';
import { setTemplates, setTemplate } from '@ember/-internals/glimmer';
import { assign } from '@ember/polyfills';
import { Router } from '@ember/-internals/routing';

import { runTask } from '../run';

export default class DefaultResolverApplicationTestCase extends AbstractApplicationTestCase {
  createApplication() {
    let application;
    expectDeprecation(() => {
      application = this.application = Application.create(this.applicationOptions);
    }, /Using the globals resolver is deprecated/);

    // If the test expects a certain number of assertions, increment that number
    let { assert } = QUnit.config.current;
    if (typeof assert.test.expected === 'number') {
      assert.test.expected += 1;
      QUnit.config.current.expected += 1;
    }

    application.Router = Router.extend(this.routerOptions);
    return application;
  }

  get applicationOptions() {
    return assign(super.applicationOptions, {
      name: 'TestApp',
      autoboot: false,
      Resolver: DefaultResolver,
    });
  }

  afterEach() {
    setTemplates({});
    return super.afterEach();
  }

  get appRouter() {
    return this.applicationInstance.lookup('router:main');
  }

  transitionTo() {
    return runTask(() => {
      return this.appRouter.transitionTo(...arguments);
    });
  }

  addTemplate(name, templateString) {
    let compiled = this.compile(templateString);
    setTemplate(name, compiled);
    return compiled;
  }
}
