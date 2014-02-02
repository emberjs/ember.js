// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals CoreTest Q$ */

var QUNIT_BREAK_ON_TEST_FAIL = false;

/** @class

  A test plan contains a set of functions that will be executed in order.  The
  results will be recorded into a results hash as well as calling a delegate.

  When you define tests and modules, you are adding to the active test plan.
  The test plan is then run when the page has finished loading.

  Normally you will not need to work with a test plan directly, though if you
  are writing a test runner application that needs to monitor test progress
  you may write a delegate to talk to the test plan.

  The CoreTest.Plan.fn hash contains functions that will be made global via
  wrapper methods.  The methods must accept a Plan object as their first
  parameter.

  ## Results

  The results hash contains a summary of the results of running the test
  plan.  It includes the following properties:

   - *assertions* -- the total number of assertions
   - *tests* -- the total number of tests
   - *passed* -- number of assertions that passed
   - *failed* -- number of assertions that failed
   - *errors* -- number of assertions with errors
   - *warnings* -- number of assertions with warnings

  You can also consult the log property, which contains an array of hashes -
  one for each assertion - with the following properties:

   - *module* -- module descriptions
   - *test* -- test description
   - *message* -- assertion description
   - *result* -- CoreTest.OK, CoreTest.FAILED, CoreTest.ERROR, CoreTest.WARN

  @since SproutCore 1.0
*/
CoreTest.Plan = {

  /**
    Define a new test plan instance.  Optionally pass attributes to apply
    to the new plan object.  Usually you will call this without arguments.

    @param {Hash} attrs plan arguments
    @returns {CoreTest.Plan} new instance/subclass
  */
  create: function(attrs) {
    var len = arguments.length,
        ret = CoreTest.beget(this),
        idx;
    for(idx=0;idx<len;idx++) CoreTest.mixin(ret, attrs);
    ret.queue = ret.queue.slice(); // want an independent queue
    return ret ;
  },

  // ..........................................................
  // RUNNING
  //

  /** @private - array of functions to execute in order. */
  queue: [],

  /**
    If true then the test plan is currently running and items in the queue
    will execute in order.

    @type {Boolean}
  */
  isRunning: false,

  /**
    Primitive used to add callbacks to the test plan queue.  Usually you will
    not want to call this method directly but instead use the module() or
    test() methods.

    @returns {CoreTest.Plan} receiver
  */
  synchronize: function synchronize(callback) {
    this.queue.push(callback);
    if (this.isRunning) this.process(); // run queue
    return this;
  },

  /**
    Processes items in the queue as long as isRunning remained true.  When
    no further items are left in the queue, calls finish().  Usually you will
    not call this method directly.  Instead call run().

    @returns {CoreTest.Plan} receiver
  */
  process: function process() {
    while(this.queue.length && this.isRunning) {
      this.queue.shift().call(this);
    }
    return this ;
  },

  /**
    Begins running the test plan after a slight delay to avoid interrupting
    any current callbacks.

    @returns {CoreTest.Plan} receiver
  */
  start: function() {
    var plan = this ;
    setTimeout(function() {
      if (plan.timeout) clearTimeout(plan.timeout);
      plan.timeout = null;
      plan.isRunning = true;
      plan.process();
    }, 13);
    return this ;
  },

  /**
    Stops the test plan from running any further.  If you pass a timeout,
    it will raise an exception if the test plan does not begin executing
    with the allotted timeout.

    @param {Number} timeout optional timeout in msec
    @returns {CoreTest.Plan} receiver
  */
  stop: function(timeout) {
    this.isRunning = false ;

    if (this.timeout) clearTimeout(this.timeout);
    if (timeout) {
      var plan = this;
      this.timeout = setTimeout(function() {
        plan.fail("Test timed out").start();
      }, timeout);
    } else this.timeout = null ;
    return this ;
  },

  /**
    Force the test plan to take a break.  Avoids slow script warnings.  This
    is called automatically after each test completes.
  */
  pause: function() {
    if (this.isRunning) {
      var del = this.delegate;
      if (del && del.planDidPause) del.planDidPause(this);

      this.isRunning = false ;
      this.start();
    }
    return this ;
  },

  /**
    Initiates running the tests for the first time.  This will add an item
    to the queue to call finish() on the plan when the run completes.

    @returns {CoreTest.Plan} receiver
  */
  run: function() {
    this.isRunning = true;
    this.prepare();

    // initialize new results
    this.results = {
      start: new Date().getTime(),
      finish: null,
      runtime: 0,
      tests: 0,
      total: 0,
      passed: 0,
      failed: 0,
      errors: 0,
      warnings: 0,
      assertions: []
    };

    // add item to queue to finish running the test plan when finished.
    this.begin().synchronize(this.finish).process();

    return this ;
  },

  /**
    Called when the test plan begins running.  This method will notify the
    delegate.  You will not normally call this method directly.

    @returns {CoreTest.Plan} receiver
  */
  begin: function() {
    var del = this.delegate;
    if (del && del.planDidBegin) del.planDidBegin(this);
    return this ;
  },

  /**
    When the test plan finishes running, this method will be called to notify
    the delegate that the plan as finished.

    @returns {CoreTest.Plan} receiver
  */
  finish: function() {
    var r   = this.results,
        del = this.delegate;

    r.finish = new Date().getTime();
    r.runtime = r.finish - r.start;

    if (del && del.planDidFinish) del.planDidFinish(this, r);
    return this ;
  },

  /**
    Sets the current module information.  This will be used when a test is
    added under the module.

    @returns {CoreTest.Plan} receiver
  */
  module: function(desc, lifecycle) {
    if (typeof SC !== 'undefined' && SC.filename) {
      desc = SC.filename.replace(/^.+?\/current\/tests\//,'') + '\n' + desc;
    }

    this.currentModule = desc;

    if (!lifecycle) lifecycle = {};
    this.setup(lifecycle.setup).teardown(lifecycle.teardown);

    return this ;
  },

  /**
    Sets the current setup method.

    @returns {CoreTest.Plan} receiver
  */
  setup: function(func) {
    this.currentSetup = func || CoreTest.K;
    return this;
  },

  /**
    Sets the current teardown method

    @returns {CoreTest.Plan} receiver
  */
  teardown: function teardown(func) {
    this.currentTeardown = func || CoreTest.K ;
    return this;
  },

  now: function() { return new Date().getTime(); },

  /**
    Generates a unit test, adding it to the test plan.
  */
  test: function test(desc, func) {

    if (!this.enabled(this.currentModule, desc)) return this; // skip

    // base prototype describing test
    var working = {
      module: this.currentModule,
      test: desc,
      expected: 0,
      assertions: []
    };

    var msg;
    var name = desc ;
    if (this.currentModule) name = this.currentModule + " module: " + name;

    var setup = this.currentSetup || CoreTest.K;
    var teardown = this.currentTeardown || CoreTest.K;

    // add setup to queue
    this.synchronize(function() {

      // save main fixture...
      var mainEl = document.getElementById('main');
      this.fixture = mainEl ? mainEl.innerHTML : '';
      mainEl = null;

      this.working = working;

      try {
        working.total_begin = working.setup_begin = this.now();
        setup.call(this);
        working.setup_end = this.now();
      } catch(e) {
        msg = (e && e.toString) ? e.toString() : "(unknown error)";
        this.error("Setup exception on " + name + ": " + msg);
      }
    });

    // now actually invoke test
    this.synchronize(function() {
      if (!func) {
        this.warn("Test not yet implemented: " + name);
      } else {
        try {
          if (CoreTest.trace) console.log("run: " + name);
          this.working.test_begin = this.now();
          func.call(this);
          this.working.test_end = this.now();
        } catch(e) {
          msg = (e && e.toString) ? e.toString() : "(unknown error)";
          this.error("Died on test #" + (this.working.assertions.length + 1) + ": " + msg);
        }
      }
    });

    // cleanup
    this.synchronize(function() {
      try {
        this.working.teardown_begin = this.now();
        teardown.call(this);
        this.working.teardown_end = this.now();
      } catch(e) {
        msg = (e && e.toString) ? e.toString() : "(unknown error)";
        this.error("Teardown exception on " + name + ": " + msg);
      }
    });

    // finally, reset and report result
    this.synchronize(function() {

      if (this.reset) {
        try {
          this.working.reset_begin = this.now();
          this.reset();
          this.working.total_end = this.working.reset_end = this.now();
        } catch(ex) {
          msg = (ex && ex.toString) ? ex.toString() : "(unknown error)";
          this.error("Reset exception on " + name + ": " + msg) ;
        }
      }

      // check for expected assertions
      var w = this.working,
          exp = w.expected,
          len = w.assertions.length;

      if (exp && exp !== len) {
        this.fail("Expected " + exp + " assertions, but " + len + " were run");
      }

      // finally, record result
      this.working = null;
      this.record(w.module, w.test, w.assertions, w);

      if (!this.pauseTime) {
        this.pauseTime = new Date().getTime();
      } else {
        var now = new Date().getTime();
        if ((now - this.pauseTime) > 250) {
          this.pause();
          this.pauseTime = now ;
        }
      }

    });
  },

  clearHtmlbody: function(){
    var body = Q$('body')[0];

    // first, find the first element with id 'htmlbody-begin'  if exists,
    // remove everything after that to reset...
    var begin = Q$('body #htmlbody-begin')[0];
    if (!begin) {
      begin = Q$('<div id="htmlbody-begin"></div>')[0];
      body.appendChild(begin);
    } else {
      while(begin.nextSibling) body.removeChild(begin.nextSibling);
    }
    begin = null;
  },

  /**
    Converts the passed string into HTML and then appends it to the main body
    element.  This is a useful way to automatically load fixture HTML into the
    main page.
  */
  htmlbody: function htmlbody(string) {
    var html = Q$(string) ;
    var body = Q$('body')[0];

    this.clearHtmlbody();

    // now append new content
    html.each(function() { body.appendChild(this); });
  },

  /**
    Records the results of a test.  This will add the results to the log
    and notify the delegate.  The passed assertions array should contain
    hashes with the result and message.
  */
  record: function(module, test, assertions, timings) {
    var r   = this.results,
        len = assertions.length,
        del = this.delegate,
        idx, cur;

    r.tests++;
    for(idx=0;idx<len;idx++) {
      cur = assertions[idx];
      cur.module = module;
      cur.test = test ;

      r.total++;
      r[cur.result]++;
      r.assertions.push(cur);
    }

    if (del && del.planDidRecord) {
      del.planDidRecord(this, module, test, assertions, timings) ;
    }

  },

  /**
    Universal method can be called to reset the global state of the
    application for each test.  The default implementation will reset any
    saved fixture.
  */
  reset: function() {
    if (this.fixture) {
      var mainEl = document.getElementById('main');
      if (mainEl) mainEl.innerHTML = this.fixture;
      mainEl = null;
    }
    return this ;
  },

  /**
    Can be used to decide if a particular test should be enabled or not.
    Current implementation allows a test to run.

    @returns {Boolean}
  */
  enabled: function(moduleName, testName) {
    return true;
  },

  // ..........................................................
  // MATCHERS
  //

  /**
    Called by a matcher to record that a test has passed.  Requires a working
    test property.
  */
  pass: function(msg) {
    var w = this.working ;
    if (!w) throw new Error("pass("+msg+") called outside of a working test");
    w.assertions.push({ message: msg, result: CoreTest.OK });
    return this ;
  },

  /**
    Called by a matcher to record that a test has failed.  Requires a working
    test property.
  */
  fail: function(msg) {
    var w = this.working ;
    if (!w) throw new Error("fail("+msg+") called outside of a working test");
    w.assertions.push({ message: msg, result: CoreTest.FAIL });
    return this ;
  },

  /**
    Called by a matcher to record that a test issued a warning.  Requires a
    working test property.
  */
  warn: function(msg) {
    var w = this.working ;
    if (!w) throw new Error("warn("+msg+") called outside of a working test");
    w.assertions.push({ message: msg, result: CoreTest.WARN });
    return this ;
  },

  /**
    Called by a matcher to record that a test had an error.  Requires a
    working test property.
  */
  error: function(msg, e) {
    var w = this.working ;
    if (!w) throw new Error("error("+msg+") called outside of a working test");

    if(e && typeof console != "undefined" && console.error && console.warn ) {
      console.error(msg);
      console.error(e);
    }

    w.assertions.push({ message: msg, result: CoreTest.ERROR });
    return this ;
  },

  /**
    Any methods added to this hash will be made global just before the first
    test is run.  You can add new methods to this hash to use them in unit
    tests.  "this" will always be the test plan.
  */
  fn: {

    /**
      Primitive will pass or fail the test based on the first boolean.  If you
      pass an actual and expected value, then this will automatically log the
      actual and expected values.  Otherwise, it will expect the message to
      be passed as the second argument.

      @param {Boolean} pass true if pass
      @param {Object} actual optional actual
      @param {Object} expected optional expected
      @param {String} msg optional message
      @returns {CoreTest.Plan} receiver
    */
    ok: function ok(pass, actual, expected, msg) {
      if (msg === undefined) {
        msg = actual ;
        if (!msg) msg = pass ? "OK" : "failed";
      } else {
        if (!msg) msg = pass ? "OK" : "failed";
        if (pass) {
          msg = msg + ": " + CoreTest.dump(expected) ;
        } else {
          msg = msg + ", expected: " + CoreTest.dump(expected) + " result: " + CoreTest.dump(actual);
        }
      }

      if (QUNIT_BREAK_ON_TEST_FAIL & !pass) {
        throw msg;
      }

      return !!pass ? this.pass(msg) : this.fail(msg);
    },

    /**
      Primitive performs a basic equality test on the passed values.  Prints
      out both actual and expected values.

      Preferred to ok(actual === expected, message);

      @param {Object} actual tested object
      @param {Object} expected expected value
      @param {String} msg optional message
      @returns {CoreTest.Plan} receiver
    */
    equals: function equals(actual, expected, msg) {
      if (msg === undefined) msg = null; // make sure ok logs properly
      return this.ok(actual == expected, actual, expected, msg);
    },

    /**
      Expects the passed function call to throw an exception of the given
      type. If you pass null or Error for the expected exception, this will
      pass if any error is received.  If you pass a string, this will check
      message property of the exception.

      @param {Function} callback the function to execute
      @param {Error} expected optional, the expected error
      @param {String} a description
      @returns {CoreTest.Plan} receiver
    */
    should_throw: function should_throw(callback, expected, msg) {
      var actual = false ;

      try {
        callback();
      } catch(e) {
        actual = (typeof expected === "string") ? e.message : e;
      }

      if (expected===false) {
        ok(actual===false, CoreTest.fmt("%@ expected no exception, actual %@", msg, actual));
      } else if (expected===Error || expected===null || expected===true) {
        ok(!!actual, CoreTest.fmt("%@ expected exception, actual %@", msg, actual));
      } else {
        equals(actual, expected, msg);
      }
    },

    /**
      Specify the number of expected assertions to gaurantee that a failed
      test (no assertions are run at all) don't slip through

      @returns {CoreTest.Plan} receiver
    */
    expect: function expect(asserts) {
      this.working.expected = asserts;
    },

    /**
      Verifies that two objects are actually the same.  This method will do
      a deep compare instead of a simple equivalence test.  You should use
      this instead of equals() when you expect the two object to be different
      instances but to have the same content.

      @param {Object} value tested object
      @param {Object} actual expected value
      @param {String} msg optional message
      @returns {CoreTest.Plan} receiver
    */
    same: function(actual, expected, msg) {
      if (msg === undefined) msg = null ; // make sure ok logs properly
      return this.ok(CoreTest.equiv(actual, expected), actual, expected, msg);
    },

    /**
      Stops the current tests from running.  An optional timeout will
      automatically fail the test if it does not restart within the specified
      period of time.

      @param {Number} timeout timeout in msec
      @returns {CoreTest.Plan} receiver
    */
    stop: function(timeout) {
      return this.stop(timeout);
    },

    /**
      Restarts tests running.  Use this to begin tests after you stop tests.

      @returns {CoreTest.Plan} receiver
    */
    start: function() {
      return this.start();
    },

    reset: function() {
      return this.reset();
    }

  },

  /**
    Exports the comparison functions into the global namespace.  This will
    allow you to call these methods from within testing functions.  This
    method is called automatically just before the first test is run.

    @returns {CoreTest.Plan} receiver
  */
  prepare: function() {
    var fn   = this.fn,
        plan = this,
        key, func;

    for(key in fn) {
      if (!fn.hasOwnProperty(key)) continue ;
      func = fn[key];
      if (typeof func !== "function") continue ;
      window[key] = this._bind(func);
      if (!plan[key]) plan[key] = func;
    }
    return this ;
  },

  _bind: function(func) {
    var plan = this;
    return function() { return func.apply(plan, arguments); };
  }

};

// ..........................................................
// EXPORT BASIC API
//

CoreTest.defaultPlan = function defaultPlan() {
  var plan = CoreTest.plan;
  if (!plan) {
    CoreTest.runner = CoreTest.Runner.create();
    plan = CoreTest.plan = CoreTest.runner.plan;
  }
  return plan;
};

// create a module.  If this is the first time, create the test plan and
// runner.  This will cause the test to run on page load
window.module = function(desc, l) {
  CoreTest.defaultPlan().module(desc, l);
};

// create a test.  If this is the first time, create the test plan and
// runner.  This will cause the test to run on page load
window.test = function(desc, func) {
  CoreTest.defaultPlan().test(desc, func);
};

// reset htmlbody for unit testing
window.clearHtmlbody = function() {
  CoreTest.defaultPlan().clearHtmlbody();
};

window.htmlbody = function(string) {
  CoreTest.defaultPlan().htmlbody(string);
};
