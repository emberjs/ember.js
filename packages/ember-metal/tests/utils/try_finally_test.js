var tryCount, finalizeCount, tryable, finalizer, error, tryableResult, finalizerResult;

module("Ember.tryFinally", {
  setup: function() {
    error = new Error('Test Error');
    tryCount = 0;
    finalizeCount = 0;
    tryableResult = 'tryable return value';
    finalizerResult = undefined;

    tryable   = function() { tryCount++;      return tryableResult;   };
    finalizer = function() { finalizeCount++; return finalizerResult; };
  },

  teardown: function() {
    tryCount = finalizeCount = tryable = finalizer = finalizeCount = tryableResult = null;
  }
});

function callTryFinallyWithError() {
  var errorWasThrown;
  try {
    Ember.tryFinally(tryable, finalizer);
  } catch(e) {
    errorWasThrown = true;
    equal(e, error, 'correct error was thrown');
  }

  equal(errorWasThrown, true,  'error was thrown');
}

test("no failure", function() {
  equal(Ember.tryFinally(tryable, finalizer), tryableResult, 'correct return value');

  equal(tryCount,      1, 'tryable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("no failure, return from finally", function() {
  finalizerResult = 'finalizer return value';

  equal(Ember.tryFinally(tryable, finalizer), finalizerResult, 'crrect return value');

  equal(tryCount,      1, 'tryable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("try failed", function() {
  tryable = function() { tryCount++; throw error; };

  callTryFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("finally failed", function() {
  finalizer = function() { finalizeCount++; throw error; };

  callTryFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("finally and try failed", function() {
  tryable   = function() { tryCount++;      throw error; };
  finalizer = function() { finalizeCount++; throw error; };

  callTryFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});
