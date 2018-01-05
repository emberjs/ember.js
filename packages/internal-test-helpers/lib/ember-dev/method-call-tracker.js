/* globals QUnit */

import { checkTest } from './utils';

var MethodCallTracker = function(env, methodName) {
  this._env = env;
  this._methodName = methodName;
  this._isExpectingNoCalls = false;
  this._expecteds = [];
  this._actuals = [];
};

MethodCallTracker.prototype = {
  stubMethod() {
    if (this._originalMethod) {
      // Method is already stubbed
      return;
    }

    let env = this._env;
    let methodName = this._methodName;

    this._originalMethod = env.getDebugFunction(methodName);

    env.setDebugFunction(methodName, (message, test) => {
      let resultOfTest = checkTest(test);

      this._actuals.push([ message, resultOfTest ]);
    });
  },

  restoreMethod() {
    if (this._originalMethod) {
      this._env.setDebugFunction(this._methodName, this._originalMethod);
    }
  },

  expectCall(message) {
    this.stubMethod();
    this._expecteds.push(message || /.*/);
  },

  expectNoCalls() {
    this.stubMethod();
    this._isExpectingNoCalls = true;
  },

  isExpectingNoCalls() {
    return this._isExpectingNoCalls;
  },

  isExpectingCalls() {
    return !this._isExpectingNoCalls && this._expecteds.length;
  },

  assert() {
    let env = this._env;
    let methodName = this._methodName;
    let isExpectingNoCalls = this._isExpectingNoCalls;
    let expecteds = this._expecteds;
    let actuals = this._actuals;
    let o, i;

    if (!isExpectingNoCalls && expecteds.length === 0 && actuals.length === 0) {
      return;
    }

    if (env.runningProdBuild) {
      QUnit.ok(true, `calls to Ember.${methodName} disabled in production builds.`);
      return;
    }

    if (isExpectingNoCalls) {
      let actualMessages = [];
      for (i = 0; i < actuals.length; i++) {
        if (!actuals[i][1]) {
          actualMessages.push(actuals[i][0]);
        }
      }
      QUnit.ok(actualMessages.length === 0, `Expected no Ember.${methodName} calls, got ${actuals.length}: ${actualMessages.join(', ')}`);
      return;
    }

    let expected, actual, match;

    for (o = 0; o < expecteds.length; o++) {
      expected = expecteds[o];
      for (i = 0; i < actuals.length; i++) {
        actual = actuals[i];
        if (!actual[1]) {
          if (expected instanceof RegExp) {
            if (expected.test(actual[0])) {
              match = actual;
              break;
            }
          } else {
            if (expected === actual[0]) {
              match = actual;
              break;
            }
          }
        }
      }

      if (!actual) {
        QUnit.ok(false, `Received no Ember.${methodName} calls at all, expecting: ${expected}`);
      } else if (match && !match[1]) {
        QUnit.ok(true, `Received failing Ember.${methodName} call with message: ${match[0]}`);
      } else if (match && match[1]) {
        QUnit.ok(false, `Expected failing Ember.${methodName} call, got succeeding with message: ${match[0]}`);
      } else if (actual[1]) {
        QUnit.ok(false, `Did not receive failing Ember.${methodName} call matching '${expected}', last was success with '${actual[0]}'`);
      } else if (!actual[1]) {
        QUnit.ok(false, `Did not receive failing Ember.${methodName} call matching '${expected}', last was failure with '${actual[0]}'`);
      }
    }
  }
};

export default MethodCallTracker;
