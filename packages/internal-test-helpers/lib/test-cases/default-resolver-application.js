import AbstractApplicationTestCase from './abstract-application';
import DefaultResolver from '@ember/application/globals-resolver';
import Application from '@ember/application';
import { setTemplates, setTemplate } from '@ember/-internals/glimmer';
import { assign } from '@ember/polyfills';
import { Router } from '@ember/-internals/routing';

import { runTask } from '../run';

export default class DefaultResolverApplicationTestCase extends AbstractApplicationTestCase {
  createApplication() {
    let application = (this.application = Application.create(this.applicationOptions));
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
