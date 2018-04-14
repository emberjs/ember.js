import { checkTest } from './utils';

var MethodCallTracker = function(env, methodName) {
  this._env = env;
  this._methodName = methodName;
  this._isExpectingNoCalls = false;
  this._expectedMessages = [];
  this._expectedOptionLists = [];
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

    env.setDebugFunction(methodName, (message, test, options) => {
      let resultOfTest = checkTest(test);

      this._actuals.push([message, resultOfTest, options]);
    });
  },

  restoreMethod() {
    if (this._originalMethod) {
      this._env.setDebugFunction(this._methodName, this._originalMethod);
    }
  },

  expectCall(message, options) {
    this.stubMethod();
    this._expectedMessages.push(message || /.*/);
    this._expectedOptionLists.push(options);
  },

  expectNoCalls() {
    this.stubMethod();
    this._isExpectingNoCalls = true;
  },

  isExpectingNoCalls() {
    return this._isExpectingNoCalls;
  },

  isExpectingCalls() {
    return !this._isExpectingNoCalls && this._expectedMessages.length;
  },

  assert() {
    let { assert } = QUnit.config.current;
    let env = this._env;
    let methodName = this._methodName;
    let isExpectingNoCalls = this._isExpectingNoCalls;
    let expectedMessages = this._expectedMessages;
    let expectedOptionLists = this._expectedOptionLists;
    let actuals = this._actuals;
    let o, i, j;

    if (!isExpectingNoCalls && expectedMessages.length === 0 && actuals.length === 0) {
      return;
    }

    if (env.runningProdBuild) {
      assert.ok(true, `calls to Ember.${methodName} disabled in production builds.`);
      return;
    }

    if (isExpectingNoCalls) {
      let actualMessages = [];
      for (i = 0; i < actuals.length; i++) {
        if (!actuals[i][1]) {
          actualMessages.push(actuals[i][0]);
        }
      }
      assert.ok(
        actualMessages.length === 0,
        `Expected no Ember.${methodName} calls, got ${actuals.length}: ${actualMessages.join(', ')}`
      );
      return;
    }

    let expectedMessage,
      expectedOptionList,
      actual,
      match,
      matchesMessage,
      matchesOptionList,
      expectedOptionsMessage,
      actualOptionsMessage;

    for (o = 0; o < expectedMessages.length; o++) {
      expectedMessage = expectedMessages[o];
      expectedOptionList = expectedOptionLists[o];

      for (i = 0; i < actuals.length; i++) {
        matchesMessage = false;
        matchesOptionList = false;
        actual = actuals[i];

        if (actual[1] === true) {
          continue;
        }

        if (expectedMessage instanceof RegExp && expectedMessage.test(actual[0])) {
          matchesMessage = true;
        } else if (expectedMessage === actual[0]) {
          matchesMessage = true;
        }

        if (expectedOptionList === undefined) {
          matchesOptionList = true;
        } else if (actual[2]) {
          matchesOptionList = true;

          for (j = 0; j < expectedOptionList.length; j++) {
            matchesOptionList =
              matchesOptionList && actual[2].hasOwnProperty(expectedOptionList[j]);
          }
        }

        if (matchesMessage && matchesOptionList) {
          match = actual;
          break;
        }
      }

      expectedOptionsMessage = expectedOptionList
        ? `and options: { ${expectedOptionList.join(', ')} }`
        : 'and no options';
      actualOptionsMessage = actual[2]
        ? `and options: { ${Object.keys(actual[2]).join(', ')} }`
        : 'and no options';

      if (!actual) {
        assert.ok(
          false,
          `Received no Ember.${methodName} calls at all, expecting: ${expectedMessage}`
        );
      } else if (match && !match[1]) {
        assert.ok(true, `Received failing Ember.${methodName} call with message: ${match[0]}`);
      } else if (match && match[1]) {
        assert.ok(
          false,
          `Expected failing Ember.${methodName} call, got succeeding with message: ${match[0]}`
        );
      } else if (actual[1]) {
        assert.ok(
          false,
          `Did not receive failing Ember.${methodName} call matching '${expectedMessage}' ${expectedOptionsMessage}, last was success with '${
            actual[0]
          }' ${actualOptionsMessage}`
        );
      } else if (!actual[1]) {
        assert.ok(
          false,
          `Did not receive failing Ember.${methodName} call matching '${expectedMessage}' ${expectedOptionsMessage}, last was failure with '${
            actual[0]
          }' ${actualOptionsMessage}`
        );
      }
    }
  },
};

export default MethodCallTracker;
