import { BootOptions } from '@ember/application/instance';
import Controller from '@ember/controller';
import EmberObject from '@ember/object';
import { NoneLocation } from '@ember/-internals/routing';

import ApplicationTestCase from './application';
import { runLoopSettled } from '../run';

export default abstract class QueryParamTestCase extends ApplicationTestCase {
  expectedPushURL: unknown;
  expectedReplaceURL: unknown;

  constructor(assert: QUnit['assert']) {
    super(assert);

    let testCase = this;
    testCase.expectedPushURL = null;
    testCase.expectedReplaceURL = null;

    this.add(
      'location:test',
      NoneLocation.extend({
        setURL(path: string) {
          if (testCase.expectedReplaceURL) {
            testCase.assert.ok(false, 'pushState occurred but a replaceState was expected');
          }

          if (testCase.expectedPushURL) {
            testCase.assert.equal(path, testCase.expectedPushURL, 'an expected pushState occurred');
            testCase.expectedPushURL = null;
          }

          this.set('path', path);
        },

        replaceURL(path: string) {
          if (testCase.expectedPushURL) {
            testCase.assert.ok(false, 'replaceState occurred but a pushState was expected');
          }

          if (testCase.expectedReplaceURL) {
            testCase.assert.equal(
              path,
              testCase.expectedReplaceURL,
              'an expected replaceState occurred'
            );
            testCase.expectedReplaceURL = null;
          }

          this.set('path', path);
        },
      })
    );
  }

  visitAndAssert(path: string, options?: BootOptions) {
    return this.visit(path, options).then(() => {
      this.assertCurrentPath(path);
    });
  }

  getController(name: string) {
    return this.applicationInstance!.lookup(`controller:${name}`);
  }

  getRoute(name: string) {
    return this.applicationInstance!.lookup(`route:${name}`);
  }

  get routerOptions() {
    return {
      location: 'test',
    };
  }

  async setAndFlush(obj: EmberObject, prop: Record<string, unknown>): Promise<void>;
  async setAndFlush(obj: EmberObject, prop: string, value: unknown): Promise<void>;
  async setAndFlush(obj: EmberObject, prop: Record<string, unknown> | string, value?: unknown) {
    if (typeof prop === 'object') {
      obj.setProperties(prop);
    } else {
      obj.set(prop, value);
    }

    await runLoopSettled();
  }

  assertCurrentPath(path: string, message = `current path equals '${path}'`) {
    this.assert.equal(this.appRouter.get('location.path'), path, message);
  }

  /**
    Sets up a Controller for a given route with a single query param and default
    value. Can optionally extend the controller with an object.

    @public
    @method setSingleQPController
  */
  setSingleQPController(routeName: string, param = 'foo', defaultValue = 'bar', options = {}) {
    this.add(
      `controller:${routeName}`,
      Controller.extend(
        {
          queryParams: [param],
          [param]: defaultValue,
        },
        options
      )
    );
  }

  /**
    Sets up a Controller for a given route with a custom property/url key mapping.

    @public
    @method setMappedQPController
  */
  setMappedQPController(
    routeName: string,
    prop = 'page',
    urlKey = 'parentPage',
    defaultValue = 1,
    options = {}
  ) {
    this.add(
      `controller:${routeName}`,
      Controller.extend(
        {
          queryParams: {
            [prop]: urlKey,
          },
          [prop]: defaultValue,
        },
        options
      )
    );
  }
}
