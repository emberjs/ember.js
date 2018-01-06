import { compile } from 'ember-template-compiler';
import { EMBER_GLIMMER_REMOVE_APPLICATION_TEMPLATE_WRAPPER } from 'ember/features';
import AbstractTestCase from './abstract';
import { runDestroy } from '../run';

export default class AbstractApplicationTestCase extends AbstractTestCase {

  _ensureInstance(bootOptions) {
    if (this._applicationInstancePromise) {
      return this._applicationInstancePromise;
    }

    return this._applicationInstancePromise = this.runTask(() => this.application.boot())
      .then((app) => {
        this.applicationInstance = app.buildInstance();

        return this.applicationInstance.boot(bootOptions);
      });
  }

  visit(url, options) {
    // TODO: THIS IS HORRIBLE
    // the promise returned by `ApplicationInstance.protoype.visit` does **not**
    // currently guarantee rendering is completed
    return this.runTask(() => {
      return this._ensureInstance(options).then(instance => instance.visit(url));
    });
  }

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

  afterEach() {
    runDestroy(this.applicationInstance);
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
