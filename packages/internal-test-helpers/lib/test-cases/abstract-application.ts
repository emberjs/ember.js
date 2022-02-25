import { compile, EmberPrecompileOptions } from 'ember-template-compiler';
import { ENV } from '@ember/-internals/environment';
import AbstractTestCase from './abstract';
import { runDestroy, runTask, runLoopSettled } from '../run';
import Application from '@ember/application';
import ApplicationInstance, { BootOptions } from '@ember/application/instance';
import Router from '@ember/routing/router';

export default abstract class AbstractApplicationTestCase extends AbstractTestCase {
  _applicationInstancePromise?: Promise<ApplicationInstance>;

  abstract application: Application;

  abstract applicationInstance?: ApplicationInstance;

  _ensureInstance(bootOptions?: BootOptions) {
    if (this._applicationInstancePromise) {
      return this._applicationInstancePromise;
    }

    return (this._applicationInstancePromise = runTask(() => this.application.boot()).then(
      (app) => {
        this.applicationInstance = app.buildInstance();

        return this.applicationInstance.boot(bootOptions);
      }
    ));
  }

  async visit(url: string, options?: BootOptions) {
    // Create the instance
    let instance = await this._ensureInstance(options).then((instance) =>
      runTask(() => instance.visit(url))
    );

    // Await all asynchronous actions
    await runLoopSettled();

    return instance;
  }

  _element: Element | null = null;

  get element(): Element | null {
    if (this._element) {
      return this._element;
    }

    let element = document.querySelector(
      ENV._APPLICATION_TEMPLATE_WRAPPER ? '#qunit-fixture > div.ember-view' : '#qunit-fixture'
    );

    return (this._element = element);
  }

  set element(element: Element | null) {
    this._element = element;
  }

  afterEach() {
    runDestroy(this.applicationInstance);
    runDestroy(this.application);

    super.teardown();
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
    return this.application.resolveRegistration('router:main') as typeof Router;
  }

  compile(templateString: string, options: Partial<EmberPrecompileOptions> = {}): unknown {
    return compile(templateString, options);
  }
}
