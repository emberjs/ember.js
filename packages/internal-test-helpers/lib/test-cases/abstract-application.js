import { compile } from 'ember-template-compiler';
import { EMBER_GLIMMER_REMOVE_APPLICATION_TEMPLATE_WRAPPER } from 'ember/features';
import AbstractTestCase from './abstract';
import { runDestroy } from '../run';

export default class AbstractApplicationTestCase extends AbstractTestCase {

  get element() {
    if (this._element) {
      return this._element;
    } else if (EMBER_GLIMMER_REMOVE_APPLICATION_TEMPLATE_WRAPPER) {
      return this._element = document.querySelector('#qunit-fixture');
    } else {
      return this._element = document.querySelector('#qunit-fixture > div.ember-view');
    }
  }

  set element(element) {
    this._element = element;
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

  compile(/* string, options */) {
    return compile(...arguments);
  }

}
