import type { EmberPrecompileOptions } from 'ember-template-compiler';
import compile from '../compile';
import AbstractTestCase from './abstract';
import { runDestroy, runTask, runLoopSettled } from '../run';
import type { BootOptions } from '@ember/engine/instance';
import type Application from '@ember/application';
import type ApplicationInstance from '@ember/application/instance';
import type Router from '@ember/routing/router';

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

    let element = document.querySelector('#qunit-fixture');

    return (this._element = element);
  }

  set element(element: Element | null) {
    this._element = element;
  }

  afterEach() {
    try {
      // Clean up GXT active components before application destroy
      const gxtCleanup = (globalThis as any).__gxtCleanupActiveComponents;
      if (typeof gxtCleanup === 'function') {
        gxtCleanup();
      }

      runDestroy(this.applicationInstance);
      runDestroy(this.application);

      super.teardown();
    } finally {
      (globalThis as any).__gxtPendingSync = false;
      (globalThis as any).__gxtPendingSyncFromPropertyChange = false;
      (globalThis as any).__gxtSyncScheduled = false;
      // Clear stale render errors so they don't leak into the next test.
      const clearErrors = (globalThis as any).__gxtClearRenderErrors;
      if (typeof clearErrors === 'function') clearErrors();
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
    return this.application.resolveRegistration('router:main') as typeof Router;
  }

  compile(templateString: string, options: Partial<EmberPrecompileOptions> = {}) {
    return compile(templateString, options);
  }
}
