import { compile } from 'ember-template-compiler';
import { ENV } from '@ember/-internals/environment';
import AbstractTestCase from './abstract';
import { runDestroy, runTask, runLoopSettled } from '../run';

export default class AbstractApplicationTestCase extends AbstractTestCase {
  _ensureInstance(bootOptions) {
    if (this._applicationInstancePromise) {
      return this._applicationInstancePromise;
    }

    return (this._applicationInstancePromise = runTask(() => this.application.boot()).then(app => {
      this.applicationInstance = app.buildInstance();

      return this.applicationInstance.boot(bootOptions);
    }));
  }

  async visit(url, options) {
    // Create the instance
    let instance = await this._ensureInstance(options).then(instance =>
      runTask(() => instance.visit(url))
    );

    // Await all asynchronous actions
    await runLoopSettled();

    return instance;
  }

  get element() {
    if (this._element) {
      return this._element;
    } else if (ENV._APPLICATION_TEMPLATE_WRAPPER) {
      return (this._element = document.querySelector('#qunit-fixture > div.ember-view'));
    } else {
      return (this._element = document.querySelector('#qunit-fixture'));
    }
  }

  set element(element) {
    this._element = element;
  }

  afterEach() {
    runDestroy(this.applicationInstance);
    runDestroy(this.application);

    super.teardown();

    let descriptor = Object.getOwnPropertyDescriptor(this, 'application');
    if (descriptor && descriptor.value) {
      this.application = undefined;
    }
    descriptor = Object.getOwnPropertyDescriptor(this, 'applicationInstance');
    if (descriptor && descriptor.value) {
      this.applicationInstance = undefined;
    }
  }

  get applicationOptions() {
    return {
      rootElement: '#qunit-fixture',
    };
  }

  get routerOptions() {
    return {
      location: 'none',
    };
  }

  get router() {
    return this.application.resolveRegistration('router:main');
  }

  compile(/* string, options */) {
    return compile(...arguments);
  }
}
