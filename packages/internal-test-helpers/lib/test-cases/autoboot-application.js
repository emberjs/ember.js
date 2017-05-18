import AbstractTestCase from './abstract';
import TestResolver from '../test-resolver';
import { Application } from 'ember-application';
import { assign } from 'ember-utils';
import { runDestroy } from '../run';

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

  addTemplate(templateName, templateString) {
    this.resolver.addTemplate(templateName, templateString);
  }

}

