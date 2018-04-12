import AbstractApplicationTestCase from './abstract-application';
import { Resolver as DefaultResolver } from 'ember-application';
import Application from '@ember/application';
import { setTemplates, setTemplate } from 'ember-glimmer';
import { assign } from 'ember-utils';
import { Router } from 'ember-routing';

export default class ApplicationTestCase extends AbstractApplicationTestCase {
  createApplication() {
    let application = (this.application = Application.create(this.applicationOptions));
    application.Router = Router.extend(this.routerOptions);
    return application;
  }

  get applicationOptions() {
    return assign(super.applicationOptions, {
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
    return this.runTask(() => {
      return this.appRouter.transitionTo(...arguments);
    });
  }

  addTemplate(name, templateString) {
    let compiled = this.compile(templateString);
    setTemplate(name, compiled);
    return compiled;
  }
}
