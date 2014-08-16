(function() {
  window.EmberDev = window.EmberDev || { assertions: {}, deprecations: {} };

  EmberDev.assertions.noViewsRemain = function(){
    if (Ember && Ember.View) {
      var viewIds = [], id;
      for (id in Ember.View.views) {
        if (Ember.View.views[id] != null) {
          viewIds.push(id);
        }
      }

      if (viewIds.length > 0) {
        deepEqual(viewIds, [], "Ember.View.views should be empty");
        Ember.View.views = [];
      }
    }
  };

  EmberDev.assertions.noTemplatesRemain = function(){
    if (Ember && Ember.TEMPLATES) {
      var templateNames = [], name;
      for (name in Ember.TEMPLATES) {
        if (Ember.TEMPLATES[name] != null) {
          templateNames.push(name);
        }
      }

      if (templateNames.length > 0) {
        deepEqual(templateNames, [], "Ember.TEMPLATES should be empty");
        Ember.TEMPLATES = {};
      }
    }
  };

  EmberDev.assertions.noExpectedDeprecations = function(){
    window.assertDeprecation();
  };

  EmberDev.afterEach = function() {
    EmberDev.assertions.noViewsRemain();
    EmberDev.assertions.noTemplatesRemain();
    EmberDev.assertions.noExpectedDeprecations();
  };

  // hack qunit to not suck for Ember objects
  var originalTypeof = QUnit.jsDump.typeOf;

  QUnit.jsDump.typeOf = function(obj) {
    if (Ember && Ember.Object && Ember.Object.detectInstance(obj)) {
      return "emberObject";
    }

    return originalTypeof.call(this, obj);
  };

  // raises is deprecated, but we likely want to keep it around for our es3
  // test runs.
  QUnit.constructor.prototype.raises = QUnit['throws'];
  window.raises = QUnit['throws'];

  QUnit.jsDump.parsers.emberObject = function(obj) {
    return obj.toString();
  };

  var originalModule = QUnit.module;
  QUnit.module = function(name, origOpts) {
    var opts = {};
    if (origOpts && origOpts.setup) { opts.setup = origOpts.setup; }
    opts.teardown = function() {
      if (origOpts && origOpts.teardown) { origOpts.teardown(); }

      if (Ember && Ember.run) {
        if (Ember.run.currentRunLoop) {
          ok(false, "Should not be in a run loop at end of test");
          while (Ember.run.currentRunLoop) {
            Ember.run.end();
          }
        }
        if (Ember.run.hasScheduledTimers()) {
          // Use `ok` so we get full description.
          // Gate inside of `if` so that we don't mess up `expects` counts
          ok(false, "Ember run should not have scheduled timers at end of test");
          Ember.run.cancelTimers();
        }
      }

      if (EmberDev.afterEach) {
        EmberDev.afterEach();
      }
    };
    return originalModule(name, opts);
  };

  // Tests should time out after 5 seconds
  QUnit.config.testTimeout = 5000;

  // Hide passed tests by default
  QUnit.config.hidepassed = true;

  // Handle testing feature flags
  QUnit.config.urlConfig.push({ id: 'enableoptionalfeatures', label: "Enable Opt Features"});

  // Handle extending prototypes
  QUnit.config.urlConfig.push({ id: 'extendprototypes', label: 'Extend Prototypes'});

  // Raise on unhandled deprecation
  QUnit.config.urlConfig.push({ id: 'raiseonunhandleddeprecation', label: 'Raise on Deprecation'});

  // Handle JSHint
  QUnit.config.urlConfig.push('nojshint');

  EmberDev.jsHint = !QUnit.urlParams.nojshint;

  var o_create = Object.create || (function(){
    function F(){}

    return function(o) {
      if (arguments.length !== 1) {
        throw new Error('Object.create implementation only accepts one parameter.');
      }
      F.prototype = o;
      return new F();
    };
  }());

  EmberDev.runningProdBuild = !!QUnit.urlParams.prod;

  // A light class for stubbing
  //
  function MethodCallExpectation(target, property){
    this.target = target;
    this.property = property;
  };

  MethodCallExpectation.prototype = {
    handleCall: function(){
      this.sawCall = true;
      return this.originalMethod.apply(this.target, arguments);
    },
    stubMethod: function(replacementFunc){
      var context = this,
          property = this.property;

      this.originalMethod = this.target[property];

      if (typeof replacementFunc === 'function') {
        this.target[property] = replacementFunc;
      } else {
        this.target[property] = function(){
          return context.handleCall.apply(context, arguments);
        };
      }
    },
    restoreMethod: function(){
      this.target[this.property] = this.originalMethod;
    },
    runWithStub: function(fn, replacementFunc){
      try {
        this.stubMethod(replacementFunc);
        fn();
      } finally {
        this.restoreMethod();
      }
    },
    assert: function() {
      this.runWithStub.apply(this, arguments);
      ok(this.sawCall, "Expected "+this.property+" to be called.");
    }
  };

  function AssertExpectation(message){
    MethodCallExpectation.call(this, Ember, 'assert');
    this.expectedMessage = message;
  };
  AssertExpectation.Error = function(){};
  AssertExpectation.prototype = o_create(MethodCallExpectation.prototype);
  AssertExpectation.prototype.handleCall = function(message, test){
    this.sawCall = true;
    if (test) return; // Only get message for failures
    this.actualMessage = message;
    // Halt execution
    throw new AssertExpectation.Error();
  };
  AssertExpectation.prototype.assert = function(fn){
    try {
      this.runWithStub(fn);
    } catch (e) {
      if (!(e instanceof AssertExpectation.Error))
        throw e;
    }

    // Run assertions in an order that is useful when debugging a test failure.
    //
    if (!this.sawCall) {
      ok(false, "Expected Ember.assert to be called (Not called with any value).");
    } else if (!this.actualMessage) {
      ok(false, 'Expected a failing Ember.assert (Ember.assert called, but without a failing test).');
    } else {
      if (this.expectedMessage) {
        if (this.expectedMessage instanceof RegExp) {
          ok(this.expectedMessage.test(this.actualMessage), "Expected failing Ember.assert: '" + this.expectedMessage + "', but got '" + this.actualMessage + "'.");
        } else {
          equal(this.actualMessage, this.expectedMessage, "Expected failing Ember.assert: '" + this.expectedMessage + "', but got '" + this.actualMessage + "'.");
        }
      } else {
        // Positive assertion that assert was called
        ok(true, 'Expected a failing Ember.assert.');
      }
    }
  };

  // Looks for an exception raised within the fn.
  //
  // expectAssertion(function(){
  //   Ember.assert("Homie don't roll like that");
  // } /* , optionalMessageStringOrRegex */);
  //
  window.expectAssertion = function expectAssertion(fn, message){
    if (EmberDev.runningProdBuild){
      ok(true, 'Assertions disabled in production builds.');
      return;
    }

    // do not assert as the production builds do not contain Ember.assert
    (new AssertExpectation(message)).assert(fn);
  };

  window.ignoreAssertion = function ignoreAssertion(fn){
    var stubber = new MethodCallExpectation(Ember, 'assert'),
        noop = function(){};

    stubber.runWithStub(fn, noop);
  };

  EmberDev.deprecations = {
    NONE: 99, // 99 problems and a deprecation ain't one
    expecteds: null,
    actuals: null,
    stubEmber: function(){
      if (!EmberDev.deprecations.originalEmberDeprecate && Ember.deprecate !== EmberDev.deprecations.originalEmberDeprecate) {
        EmberDev.deprecations.originalEmberDeprecate = Ember.deprecate;
      }
      Ember.deprecate = function(msg, test) {
        EmberDev.deprecations.actuals = EmberDev.deprecations.actuals || [];
        EmberDev.deprecations.actuals.push([msg, test]);
      };
    },
    restoreEmber: function(){
      Ember.deprecate = EmberDev.deprecations.originalEmberDeprecate;
    }
  };

  // Expects no deprecation to happen from the time of calling until
  // the end of the test.
  //
  // expectNoDeprecation(/* optionalStringOrRegex */);
  // Ember.deprecate("Old And Busted");
  //
  window.expectNoDeprecation = function(message) {
    if (typeof EmberDev.deprecations.expecteds === 'array') {
      throw("expectNoDeprecation was called after expectDeprecation was called!");
    }
    EmberDev.deprecations.stubEmber();
    EmberDev.deprecations.expecteds = EmberDev.deprecations.NONE;
  };

  // Expect a deprecation to happen within a function, or if no function
  // is pass, from the time of calling until the end of the test. Can be called
  // multiple times to assert deprecations with different specific messages
  // were fired.
  //
  // expectDeprecation(function(){
  //   Ember.deprecate("Old And Busted");
  // }, /* optionalStringOrRegex */);
  //
  // expectDeprecation(/* optionalStringOrRegex */);
  // Ember.deprecate("Old And Busted");
  //
  window.expectDeprecation = function(fn, message) {
    if (EmberDev.deprecations.expecteds === EmberDev.deprecations.NONE) {
      throw("expectDeprecation was called after expectNoDeprecation was called!");
    }
    EmberDev.deprecations.stubEmber();
    EmberDev.deprecations.expecteds = EmberDev.deprecations.expecteds || [];
    if (fn && typeof fn !== 'function') {
      // fn is a message
      EmberDev.deprecations.expecteds.push(fn);
    } else {
      EmberDev.deprecations.expecteds.push(message || /.*/);
      if (fn) {
        fn();
        window.assertDeprecation();
      }
    }
  };

  window.ignoreDeprecation = function ignoreDeprecation(fn){
    var stubber = new MethodCallExpectation(Ember, 'deprecate'),
        noop = function(){};

    stubber.runWithStub(fn, noop);
  };

  // Forces an assert the deprecations occurred, and resets the globals
  // storing asserts for the next run.
  //
  // expectNoDeprecation(/Old/);
  // setTimeout(function(){
  //   Ember.deprecate("Old And Busted");
  //   assertDeprecation();
  // });
  //
  // assertDeprecation is called after each test run to catch any expectations
  // without explicit asserts.
  //
  window.assertDeprecation = function() {
    var expecteds = EmberDev.deprecations.expecteds,
        actuals   = EmberDev.deprecations.actuals || [];
    if (!expecteds) {
      EmberDev.deprecations.actuals = null;
      return;
    }

    EmberDev.deprecations.restoreEmber();
    EmberDev.deprecations.actuals = null;
    EmberDev.deprecations.expecteds = null;

    if (EmberDev.runningProdBuild){
      ok(true, 'deprecations disabled in production builds.');
      return;
    }

    if (expecteds === EmberDev.deprecations.NONE) {
      var actualMessages = [];
      for (var i=0;i<actuals.length;i++) {
        actualMessages.push(actuals[i][0]);
      }
      ok(actuals.length === 0, "Expected no deprecation calls, got "+actuals.length+": "+actualMessages.join(', '));
    } else {
      for (var o=0;o < expecteds.length; o++) {
        var expected = expecteds[o], match;
        for (var i=0;i < actuals.length; i++) {
          var actual = actuals[i];
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

        if (!actual)
          ok(false, "Recieved no deprecate calls at all, expecting: "+expected);
        else if (match && !match[1])
          ok(true, "Recieved failing deprecation with message: "+match[0]);
        else if (match && match[1])
          ok(false, "Expected failing deprecation, got succeeding with message: "+match[0]);
        else if (actual[1])
          ok(false, "Did not receive failing deprecation matching '"+expected+"', last was success with '"+actual[0]+"'");
        else if (!actual[1])
          ok(false, "Did not receive failing deprecation matching '"+expected+"', last was failure with '"+actual[0]+"'");
      }
    }
  };
})();
