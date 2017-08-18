import { compile } from 'ember-template-compiler';
import AbstractTestCase from './abstract';
import { jQuery } from 'ember-views';
import { runDestroy } from '../run';

export default class AbstractApplicationTestCase extends AbstractTestCase {

  constructor() {
    super();
    this.element = jQuery('#qunit-fixture')[0];
  }

  teardown() {
    runDestroy(this.application);
    super.teardown();
  }

  get applicationOptions() {
    return {
      rootElement: '#qunit-fixture'
    };
  }

  get routerOptions() {
    return {
      location: 'none'
    };
  }

  get router() {
    return this.application.resolveRegistration('router:main');
  }

  compile(string, options) {
    return compile(...arguments);
  }

}
