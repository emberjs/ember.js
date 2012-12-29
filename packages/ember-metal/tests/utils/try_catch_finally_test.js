var tryCount, catchCount, finalizeCount, tryable, catchable, finalizer, error,
tryableResult, catchableResult, finalizerResult;

module("Ember.tryFinally", {
  setup: function() {
    error = new Error('Test Error');
    tryCount = 0;
    finalizeCount = 0;
    catchCount = 0;
    tryableResult = 'tryable return value';
    catchableResult = 'catchable return value';
    finalizerResult = undefined;

    tryable   = function() { tryCount++;      return tryableResult;   };
    catchable = function() { catchCount++;    return catchableResult; };
    finalizer = function() { finalizeCount++; return finalizerResult; };
  },

  teardown: function() {
    tryCount = catchCount, finalizeCount = tryable = catchable = finalizer =
    finalizeCount =tryableResult = null;
  }
});

function callTryCatchFinallyWithError(){
  var errorWasThrown;
  try {
    Ember.tryCatchFinally(tryable, catchable, finalizer);
  } catch(e) {
    errorWasThrown = true;
    equal(e, error, 'correct error was thrown');
  }

  equal(errorWasThrown, true,  'error was thrown');
}

test("no failure", function() {
  equal(Ember.tryCatchFinally(tryable, catchable, finalizer), tryableResult, 'correct return value');

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    0, 'catchable was never called');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("no failure, return from finally", function() {
  finalizerResult = 'finalizer return value';

  equal(Ember.tryCatchFinally(tryable, catchable, finalizer), finalizerResult, 'correct return value');

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    0, 'catchable was never called');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("try failed", function() {
  tryable = function() { tryCount++; throw error; };

  var result = Ember.tryCatchFinally(tryable, catchable, finalizer);

  equal(result, catchableResult, 'correct return value');

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    1, 'catchable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("catch failed", function() {
  catchable = function() { catchCount++; throw error; };

  Ember.tryCatchFinally(tryable, catchable, finalizer);

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    0, 'catchable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("try and catch failed", function() {
  tryable = function() { tryCount++; throw error; };
  catchable = function() { catchCount++; throw error; };

  callTryCatchFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    1, 'catchable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("finally failed", function() {
  finalizer = function() { finalizeCount++; throw error; };

  callTryCatchFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    0, 'catchable was never called');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("finally and try failed", function() {
  tryable   = function() { tryCount++;      throw error; };
  finalizer = function() { finalizeCount++; throw error; };

  callTryCatchFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    1, 'catchable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("finally, catch and try failed", function() {
  tryable   = function() { tryCount++;      throw error; };
  catchable = function() { catchCount++; throw error; };
  finalizer = function() { finalizeCount++; throw error; };

  callTryCatchFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    1, 'catchable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});
