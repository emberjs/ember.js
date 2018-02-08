import { isTesting, setTesting } from 'ember-debug';
import { run, getOnerror, setOnerror } from 'ember-metal';
import { DEBUG } from 'ember-env-flags';
import RSVP from 'rsvp';
import require, { has } from 'require';

let WINDOW_ONERROR;

let setAdapter;
let QUnitAdapter;

QUnit.module('error_handler', {
  beforeEach() {
    if (has('ember-testing')) {
      let testing = require('ember-testing');
      setAdapter = testing.setAdapter;
      QUnitAdapter = testing.QUnitAdapter;
    }
    // capturing this outside of module scope to ensure we grab
    // the test frameworks own window.onerror to reset it
    WINDOW_ONERROR = window.onerror;
  },

  afterEach() {
    setTesting(isTesting);
    window.onerror = WINDOW_ONERROR;

    if (setAdapter) {
      setAdapter();
    }

    setOnerror(undefined);

  }
});

function runThatThrowsSync(message = 'Error for testing error handling') {
  return run(() => {
    throw new Error(message);
  });
}

function runThatThrowsAsync(message = 'Error for testing error handling') {
  return run.next(() => {
    throw new Error(message);
  });
}

QUnit.test('by default there is no onerror - sync run', function(assert) {
  assert.strictEqual(getOnerror(), undefined, 'precond - there should be no Ember.onerror set by default');
  assert.throws(runThatThrowsSync, Error, 'errors thrown sync are catchable');
});

QUnit.test('when Ember.onerror (which rethrows) is registered - sync run', function(assert) {
  assert.expect(2);
  setOnerror(function(error) {
    assert.ok(true, 'onerror called');
    throw error;
  });
  assert.throws(runThatThrowsSync, Error, 'error is thrown');
});

QUnit.test('when Ember.onerror (which does not rethrow) is registered - sync run', function(assert) {
  assert.expect(2);
  setOnerror(function() {
    assert.ok(true, 'onerror called');
  });
  runThatThrowsSync();
  assert.ok(true, 'no error was thrown, Ember.onerror can intercept errors');
});

if (DEBUG) {
  QUnit.test('when TestAdapter is registered and error is thrown - sync run', function(assert) {
    assert.expect(1);

    setAdapter({
      exception() {
        assert.notOk(true, 'adapter is not called for errors thrown in sync run loops');
      }
    });

    assert.throws(runThatThrowsSync, Error);
  });

  QUnit.test('when both Ember.onerror (which rethrows) and TestAdapter are registered - sync run', function(assert) {
    assert.expect(2);

    setAdapter({
      exception() {
        assert.notOk(true, 'adapter is not called for errors thrown in sync run loops');
      }
    });

    setOnerror(function(error) {
      assert.ok(true, 'onerror is called for sync errors even if TestAdapter is setup');
      throw error;
    });

    assert.throws(runThatThrowsSync, Error, 'error is thrown');
  });

  QUnit.test('when both Ember.onerror (which does not rethrow) and TestAdapter are registered - sync run', function(assert) {
    assert.expect(2);

    setAdapter({
      exception() {
        assert.notOk(true, 'adapter is not called for errors thrown in sync run loops');
      }
    });

    setOnerror(function() {
      assert.ok(true, 'onerror is called for sync errors even if TestAdapter is setup');
    });

    runThatThrowsSync();
    assert.ok(true, 'no error was thrown, Ember.onerror can intercept errors');
  });

  QUnit.test('when TestAdapter is registered and error is thrown - async run', function(assert) {
    assert.expect(3);
    let done = assert.async();

    let caughtInAdapter, caughtInCatch, caughtByWindowOnerror;
    setAdapter({
      exception(error) {
        caughtInAdapter = error;
      }
    });

    window.onerror = function(message) {
      caughtByWindowOnerror = message;
      // prevent "bubbling" and therefore failing the test
      return true;
    };

    try {
      runThatThrowsAsync();
    } catch(e) {
      caughtInCatch = e;
    }

    setTimeout(() => {
      assert.equal(caughtInAdapter, undefined, 'test adapter should never catch errors in run loops');
      assert.equal(caughtInCatch, undefined, 'a "normal" try/catch should never catch errors in an async run');

      assert.pushResult({
        result: /Error for testing error handling/.test(caughtByWindowOnerror),
        actual: caughtByWindowOnerror,
        expected: 'to include `Error for testing error handling`',
        message: 'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
      });

      done();
    }, 20);
  });

  QUnit.test('when both Ember.onerror and TestAdapter are registered - async run', function(assert) {
    assert.expect(1);
    let done = assert.async();

    setAdapter({
      exception() {
        assert.notOk(true, 'Adapter.exception is not called for errors thrown in run.next');
      }
    });

    setOnerror(function() {
      assert.ok(true, 'onerror is invoked for errors thrown in run.next/run.later');
    });

    runThatThrowsAsync();
    setTimeout(done, 10);
  });
}

QUnit.test('does not swallow exceptions by default (Ember.testing = true, no Ember.onerror) - sync run', function(assert) {
  setTesting(true);

  let error = new Error('the error');
  assert.throws(() => {
    run(() => {
      throw error;
    });
  }, error);
});

QUnit.test('does not swallow exceptions by default (Ember.testing = false, no Ember.onerror) - sync run', function(assert) {
  setTesting(false);
  let error = new Error('the error');
  assert.throws(() => {
    run(() => {
      throw error;
    });
  }, error);
});

QUnit.test('does not swallow exceptions (Ember.testing = false, Ember.onerror which rethrows) - sync run', function(assert) {
  assert.expect(2);
  setTesting(false);

  setOnerror(function(error) {
    assert.ok(true, 'Ember.onerror was called');
    throw error;
  });

  let error = new Error('the error');
  assert.throws(() => {
    run(() => {
      throw error;
    });
  }, error);
});

QUnit.test('Ember.onerror can intercept errors (aka swallow) by not rethrowing (Ember.testing = false) - sync run', function(assert) {
  assert.expect(1);
  setTesting(false);

  setOnerror(function() {
    assert.ok(true, 'Ember.onerror was called');
  });

  let error = new Error('the error');
  try {
    run(() => {
      throw error;
    });
  } catch(e) {
    assert.notOk(true, 'Ember.onerror that does not rethrow is intentionally swallowing errors, try / catch wrapping does not see error');
  }
});


QUnit.test('does not swallow exceptions by default (Ember.testing = true, no Ember.onerror) - async run', function(assert) {
  let done = assert.async();
  let caughtByWindowOnerror;

  setTesting(true);

  window.onerror = function(message) {
    caughtByWindowOnerror = message;
    // prevent "bubbling" and therefore failing the test
    return true;
  };

  run.later(() => {
    throw new Error('the error');
  }, 10);

  setTimeout(() => {
    assert.pushResult({
      result: /the error/.test(caughtByWindowOnerror),
      actual: caughtByWindowOnerror,
      expected: 'to include `the error`',
      message: 'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
    });

    done();
  }, 20);
});

QUnit.test('does not swallow exceptions by default (Ember.testing = false, no Ember.onerror) - async run', function(assert) {
  let done = assert.async();
  let caughtByWindowOnerror;

  setTesting(false);

  window.onerror = function(message) {
    caughtByWindowOnerror = message;
    // prevent "bubbling" and therefore failing the test
    return true;
  };

  run.later(() => {
    throw new Error('the error');
  }, 10);

  setTimeout(() => {
    assert.pushResult({
      result: /the error/.test(caughtByWindowOnerror),
      actual: caughtByWindowOnerror,
      expected: 'to include `the error`',
      message: 'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
    });

    done();
  }, 20);
});

QUnit.test('Ember.onerror can intercept errors (aka swallow) by not rethrowing (Ember.testing = false) - async run', function(assert) {
  let done = assert.async();

  setTesting(false);

  window.onerror = function() {
    assert.notOk(true, 'window.onerror is never invoked when Ember.onerror intentionally swallows errors');
    // prevent "bubbling" and therefore failing the test
    return true;
  };

  let thrown = new Error('the error');
  setOnerror(function(error) {
    assert.strictEqual(error, thrown, 'Ember.onerror is called with the error');
  });

  run.later(() => {
    throw thrown;
  }, 10);

  setTimeout(done, 20);
});

function generateRSVPErrorHandlingTests(message, generatePromise, timeout = 10) {
  QUnit.test(`${message} when Ember.onerror which does not rethrow is present - rsvp`, function(assert) {
    assert.expect(1);

    let thrown = new Error('the error');
    setOnerror(function(error) {
      assert.strictEqual(error, thrown, 'Ember.onerror is called for errors thrown in RSVP promises');
    });

    generatePromise(thrown);

    // RSVP.Promise's are configured to settle within the run loop, this
    // ensures that run loop has completed
    return new RSVP.Promise((resolve) => setTimeout(resolve, timeout));
  });

  QUnit.test(`${message} when Ember.onerror which does rethrow is present - rsvp`, function(assert) {
    assert.expect(2);

    let thrown = new Error('the error');
    setOnerror(function(error) {
      assert.strictEqual(error, thrown, 'Ember.onerror is called for errors thrown in RSVP promises');
      throw error;
    });

    window.onerror = function(message) {
      assert.pushResult({
        result: /the error/.test(message),
        actual: message,
        expected: 'to include `the error`',
        message: 'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
      });

      // prevent "bubbling" and therefore failing the test
      return true;
    };

    generatePromise(thrown);

    // RSVP.Promise's are configured to settle within the run loop, this
    // ensures that run loop has completed
    return new RSVP.Promise((resolve) => setTimeout(resolve, timeout));
  });

  QUnit.test(`${message} when Ember.onerror which does not rethrow is present (Ember.testing = false) - rsvp`, function(assert) {
    assert.expect(1);

    setTesting(false);
    let thrown = new Error('the error');
    setOnerror(function(error) {
      assert.strictEqual(error, thrown, 'Ember.onerror is called for errors thrown in RSVP promises');
    });

    generatePromise(thrown);

    // RSVP.Promise's are configured to settle within the run loop, this
    // ensures that run loop has completed
    return new RSVP.Promise((resolve) => setTimeout(resolve, timeout));
  });

  QUnit.test(`${message} when Ember.onerror which does rethrow is present (Ember.testing = false) - rsvp`, function(assert) {
    assert.expect(2);

    setTesting(false);
    let thrown = new Error('the error');
    setOnerror(function(error) {
      assert.strictEqual(error, thrown, 'Ember.onerror is called for errors thrown in RSVP promises');
      throw error;
    });

    window.onerror = function(message) {
      assert.pushResult({
        result: /the error/.test(message),
        actual: message,
        expected: 'to include `the error`',
        message: 'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
      });

      // prevent "bubbling" and therefore failing the test
      return true;
    };

    generatePromise(thrown);

    // RSVP.Promise's are configured to settle within the run loop, this
    // ensures that run loop has completed
    return new RSVP.Promise((resolve) => setTimeout(resolve, timeout));
  });

  if (DEBUG) {
    QUnit.test(`${message} when TestAdapter without \`exception\` method is present - rsvp`, function(assert) {
      assert.expect(1);

      let thrown = new Error('the error');
      setAdapter(QUnitAdapter.create({
        exception: undefined
      }));

      window.onerror = function(message) {
        assert.pushResult({
          result: /the error/.test(message),
          actual: message,
          expected: 'to include `the error`',
          message: 'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
        });

        // prevent "bubbling" and therefore failing the test
        return true;
      };

      generatePromise(thrown);

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise((resolve) => setTimeout(resolve, timeout));
    });

    QUnit.test(`${message} when both Ember.onerror and TestAdapter without \`exception\` method are present - rsvp`, function(assert) {
      assert.expect(1);

      let thrown = new Error('the error');
      setAdapter(QUnitAdapter.create({
        exception: undefined
      }));

      setOnerror(function(error) {
        assert.pushResult({
          result: /the error/.test(error.message),
          actual: error.message,
          expected: 'to include `the error`',
          message: 'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
        });
      });

      generatePromise(thrown);

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise((resolve) => setTimeout(resolve, timeout));
    });

    QUnit.test(`${message} when TestAdapter is present - rsvp`, function(assert) {
      assert.expect(1);

      let thrown = new Error('the error');
      setAdapter(QUnitAdapter.create({
        exception(error) {
          assert.strictEqual(error, thrown, 'Adapter.exception is called for errors thrown in RSVP promises');
        }
      }));

      generatePromise(thrown);

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise((resolve) => setTimeout(resolve, timeout));
    });

    QUnit.test(`${message} when both Ember.onerror and TestAdapter are present - rsvp`, function(assert) {
      assert.expect(1);

      let thrown = new Error('the error');
      setAdapter(QUnitAdapter.create({
        exception(error) {
          assert.strictEqual(error, thrown, 'Adapter.exception is called for errors thrown in RSVP promises');
        }
      }));

      setOnerror(function() {
        assert.notOk(true, 'Ember.onerror is not called if Test.adapter does not rethrow');
      });

      generatePromise(thrown);

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise((resolve) => setTimeout(resolve, timeout));
    });

    QUnit.test(`${message} when both Ember.onerror and TestAdapter are present - rsvp`, function(assert) {
      assert.expect(2);

      let thrown = new Error('the error');
      setAdapter(QUnitAdapter.create({
        exception(error) {
          assert.strictEqual(error, thrown, 'Adapter.exception is called for errors thrown in RSVP promises');
          throw error;
        }
      }));

      setOnerror(function(error) {
        assert.strictEqual(error, thrown, 'Ember.onerror is called for errors thrown in RSVP promises if Test.adapter rethrows');
      });

      generatePromise(thrown);

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise((resolve) => setTimeout(resolve, timeout));
    });
  }
}

generateRSVPErrorHandlingTests('errors in promise constructor', (error) => {
  new RSVP.Promise(() => {
    throw error;
  });
});

generateRSVPErrorHandlingTests('errors in promise .then callback', (error) => {
  RSVP.resolve().then(() => {
    throw error;
  });
});

generateRSVPErrorHandlingTests('errors in async promise .then callback', (error) => {
  new RSVP.Promise((resolve) => setTimeout(resolve, 10)).then(() => {
    throw error;
  });
}, 20);
