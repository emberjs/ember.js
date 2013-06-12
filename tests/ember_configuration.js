/*globals ENV QUnit EmberDev */

(function() {
  window.Ember = {
    testing: true
  };
  window.ENV = window.ENV || {};

  // Test for "hooks in ENV.EMBER_LOAD_HOOKS['hookName'] get executed"
  ENV.EMBER_LOAD_HOOKS = ENV.EMBER_LOAD_HOOKS || {};
  ENV.EMBER_LOAD_HOOKS.__before_ember_test_hook__ = ENV.EMBER_LOAD_HOOKS.__before_ember_test_hook__ || [];
  ENV.__test_hook_count__ = 0;
  ENV.EMBER_LOAD_HOOKS.__before_ember_test_hook__.push(function(object) {
    ENV.__test_hook_count__ += object;
  });

  // Handle extending prototypes
  QUnit.config.urlConfig.push('extendprototypes');

  var extendPrototypes = QUnit.urlParams.extendprototypes;
  ENV['EXTEND_PROTOTYPES'] = !!extendPrototypes;

  // Don't worry about jQuery version
  ENV['FORCE_JQUERY'] = true;

  if (EmberDev.jsHint) {
    // jsHint makes its own Object.create stub, we don't want to use this
    ENV['STUB_OBJECT_CREATE'] = !Object.create;
  }

  ENV['EXPERIMENTAL_CONTROL_HELPER'] = true;

  QUnit.config.urlConfig.push('enablerouteto');
  var enableRouteTo = QUnit.urlParams.enablerouteto;
  ENV['ENABLE_ROUTE_TO'] = !!enableRouteTo;

  EmberDev.distros = {
    spade:   'ember-spade.js',
    build:   'ember.js',
    prod:    'ember.prod.js',
    runtime: 'ember-runtime.js'
  };

  function expectAssertion(fn, expectedMessage) {
    var originalAssert = Ember.assert,
      actualMessage, actualTest,
      arity, sawAssertion;

    var AssertionFailedError = new Error('AssertionFailed');

    try {
      Ember.assert = function(message, test) {
        arity = arguments.length;
        actualMessage = message;
        actualTest = test;

        if (!test) {
          throw AssertionFailedError;
        }
      };

      try {
        fn();
      } catch(error) {
        if (error === AssertionFailedError) {
          sawAssertion = true;
        } else {
          throw error;
        }
      }

      if (!sawAssertion) {
        ok(false, "Expected Ember.assert: '" + expectedMessage + "', but no assertions where run");
      } else if (arity === 2) {

        if (expectedMessage) {
          if (expectedMessage instanceof RegExp) {
            ok(expectedMessage.test(actualMessage), "Expected Ember.assert: '" + expectedMessage + "', but got '" + actualMessage + "'");
          }else{
            equal(actualMessage, expectedMessage, "Expected Ember.assert: '" + expectedMessage + "', but got '" + actualMessage + "'");
          }
        } else {
          ok(!actualTest);
        }
      } else if (arity === 1) {
        ok(!actualTest);
      } else {
        ok(false, 'Ember.assert was called without the assertion');
      }

    } finally {
      Ember.assert = originalAssert;
    }
  }

  window.expectAssertion = expectAssertion;
})();
