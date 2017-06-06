import AbstractTestCase from './abstract';
import TestResolver from '../test-resolver';
import { Application } from 'ember-application';
import { assign } from 'ember-utils';
import { runDestroy } from '../run';
import { run } from 'ember-metal';
import { compile } from 'ember-template-compiler';

export default class AutobootApplicationTestCase extends AbstractTestCase {

  teardown() {
    runDestroy(this.application);
    super.teardown();
  }

  createApplication(options, MyApplication=Application) {
    let myOptions = assign({
      rootElement: '#qunit-fixture',
      Resolver: TestResolver
    }, options);
    let application = this.application = MyApplication.create(myOptions);
    this.resolver = myOptions.Resolver.lastInstance;
    return application;
  }

  add(specifier, factory) {
    this.resolver.add(specifier, factory);
  }

  get router() {
    return this.application.resolveRegistration('router:main');
  }

  visit(url, options) {
    return run(this.applicationInstance, 'visit', url, options);
  }

  get applicationInstance() {
    return this.application.__deprecatedInstance__;
  }

  compile(string, options) {
    return compile(...arguments);
  }

  addTemplate(templateName, templateString) {
    this.resolver.add(`template:${templateName}`, this.compile(templateString, {
      moduleName: templateName
    }));
  }

}
