import { Controller } from 'ember-runtime';
import { NoneLocation } from 'ember-routing';
import { run } from 'ember-metal';

import ApplicationTestCase from './application';

export default class QueryParamTestCase extends ApplicationTestCase {
  constructor() {
    super();

    let testCase = this;
    testCase.expectedPushURL = null;
    testCase.expectedReplaceURL = null;
    this.application.register('location:test', NoneLocation.extend({
      setURL(path) {
        if (testCase.expectedReplaceURL) {
          testCase.assert.ok(false, 'pushState occurred but a replaceState was expected');
        }

        if (testCase.expectedPushURL) {
          testCase.assert.equal(path, testCase.expectedPushURL, 'an expected pushState occurred');
          testCase.expectedPushURL = null;
        }

        this.set('path', path);
      },

      replaceURL(path) {
        if (testCase.expectedPushURL) {
          testCase.assert.ok(false, 'replaceState occurred but a pushState was expected');
        }

        if (testCase.expectedReplaceURL) {
          testCase.assert.equal(path, testCase.expectedReplaceURL, 'an expected replaceState occurred');
          testCase.expectedReplaceURL = null;
        }

        this.set('path', path);
      }
    }));
  }

  visitAndAssert(path) {
    return this.visit(...arguments).then(() => {
      this.assertCurrentPath(path);
    });
  }

  getController(name) {
    return this.applicationInstance.lookup(`controller:${name}`);
  }

  getRoute(name) {
    return this.applicationInstance.lookup(`route:${name}`);
  }

  get routerOptions() {
    return {
      location: 'test'
    };
  }

  setAndFlush(obj, prop, value) {
    return run(obj, 'set', prop, value);
  }

  assertCurrentPath(path, message = `current path equals '${path}'`) {
    this.assert.equal(this.appRouter.get('location.path'), path, message);
  }

  /**
    Sets up a Controller for a given route with a single query param and default
    value. Can optionally extend the controller with an object.

    @public
    @method setSingleQPController
  */
  setSingleQPController(routeName, param = 'foo', defaultValue = 'bar', options = {}) {
    this.registerController(routeName, Controller.extend({
      queryParams: [param],
      [param]: defaultValue
    }, options));
  }

  /**
    Sets up a Controller for a given route with a custom property/url key mapping.

    @public
    @method setMappedQPController
  */
  setMappedQPController(routeName, prop = 'page', urlKey = 'parentPage', defaultValue = 1, options = {}) {
    this.registerController(routeName, Controller.extend({
      queryParams: {
        [prop]: urlKey
      },
      [prop]: defaultValue
    }, options));
  }
}
