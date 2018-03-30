import { isTesting, setTesting } from 'ember-debug';
import { run, later, getOnerror, setOnerror } from 'ember-metal';
import RSVP from 'rsvp';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let WINDOW_ONERROR;

function runThatThrowsSync(message = 'Error for testing error handling') {
  return run(() => {
    throw new Error(message);
  });
}

moduleFor(
  'error_handler',
  class extends AbstractTestCase {
    beforeEach() {
      // capturing this outside of module scope to ensure we grab
      // the test frameworks own window.onerror to reset it
      WINDOW_ONERROR = window.onerror;
    }

    afterEach() {
      setTesting(isTesting);
      window.onerror = WINDOW_ONERROR;

      setOnerror(undefined);
    }

    ['@test by default there is no onerror - sync run'](assert) {
      assert.strictEqual(
        getOnerror(),
        undefined,
        'precond - there should be no Ember.onerror set by default'
      );
      assert.throws(
        runThatThrowsSync,
        Error,
        'errors thrown sync are catchable'
      );
    }

    ['@test when Ember.onerror (which rethrows) is registered - sync run'](
      assert
    ) {
      assert.expect(2);
      setOnerror(function(error) {
        assert.ok(true, 'onerror called');
        throw error;
      });
      assert.throws(runThatThrowsSync, Error, 'error is thrown');
    }

    ['@test when Ember.onerror (which does not rethrow) is registered - sync run'](
      assert
    ) {
      assert.expect(2);
      setOnerror(function() {
        assert.ok(true, 'onerror called');
      });
      runThatThrowsSync();
      assert.ok(
        true,
        'no error was thrown, Ember.onerror can intercept errors'
      );
    }

    ['@test does not swallow exceptions by default (Ember.testing = true, no Ember.onerror) - sync run'](
      assert
    ) {
      setTesting(true);

      let error = new Error('the error');
      assert.throws(() => {
        run(() => {
          throw error;
        });
      }, error);
    }

    ['@test does not swallow exceptions by default (Ember.testing = false, no Ember.onerror) - sync run'](
      assert
    ) {
      setTesting(false);
      let error = new Error('the error');
      assert.throws(() => {
        run(() => {
          throw error;
        });
      }, error);
    }

    ['@test does not swallow exceptions (Ember.testing = false, Ember.onerror which rethrows) - sync run'](
      assert
    ) {
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
    }

    ['@test Ember.onerror can intercept errors (aka swallow) by not rethrowing (Ember.testing = false) - sync run'](
      assert
    ) {
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
      } catch (e) {
        assert.notOk(
          true,
          'Ember.onerror that does not rethrow is intentionally swallowing errors, try / catch wrapping does not see error'
        );
      }
    }

    ['@test does not swallow exceptions by default (Ember.testing = true, no Ember.onerror) - async run'](
      assert
    ) {
      let done = assert.async();
      let caughtByWindowOnerror;

      setTesting(true);

      window.onerror = function(message) {
        caughtByWindowOnerror = message;
        // prevent "bubbling" and therefore failing the test
        return true;
      };

      later(() => {
        throw new Error('the error');
      }, 10);

      setTimeout(() => {
        assert.pushResult({
          result: /the error/.test(caughtByWindowOnerror),
          actual: caughtByWindowOnerror,
          expected: 'to include `the error`',
          message:
            'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
        });

        done();
      }, 20);
    }

    ['@test does not swallow exceptions by default (Ember.testing = false, no Ember.onerror) - async run'](
      assert
    ) {
      let done = assert.async();
      let caughtByWindowOnerror;

      setTesting(false);

      window.onerror = function(message) {
        caughtByWindowOnerror = message;
        // prevent "bubbling" and therefore failing the test
        return true;
      };

      later(() => {
        throw new Error('the error');
      }, 10);

      setTimeout(() => {
        assert.pushResult({
          result: /the error/.test(caughtByWindowOnerror),
          actual: caughtByWindowOnerror,
          expected: 'to include `the error`',
          message:
            'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
        });

        done();
      }, 20);
    }

    ['@test Ember.onerror can intercept errors (aka swallow) by not rethrowing (Ember.testing = false) - async run'](
      assert
    ) {
      let done = assert.async();

      setTesting(false);

      window.onerror = function() {
        assert.notOk(
          true,
          'window.onerror is never invoked when Ember.onerror intentionally swallows errors'
        );
        // prevent "bubbling" and therefore failing the test
        return true;
      };

      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called with the error'
        );
      });

      later(() => {
        throw thrown;
      }, 10);

      setTimeout(done, 20);
    }

    [`@test errors in promise constructor when Ember.onerror which does not rethrow is present - rsvp`](
      assert
    ) {
      assert.expect(1);

      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
      });

      new RSVP.Promise(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 10));
    }

    [`@test errors in promise constructor when Ember.onerror which does rethrow is present - rsvp`](
      assert
    ) {
      assert.expect(2);

      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
        throw error;
      });

      window.onerror = function(message) {
        assert.pushResult({
          result: /the error/.test(message),
          actual: message,
          expected: 'to include `the error`',
          message:
            'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
        });

        // prevent "bubbling" and therefore failing the test
        return true;
      };

      new RSVP.Promise(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 10));
    }

    [`@test errors in promise constructor when Ember.onerror which does not rethrow is present (Ember.testing = false) - rsvp`](
      assert
    ) {
      assert.expect(1);

      setTesting(false);
      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
      });

      new RSVP.Promise(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 10));
    }

    [`@test errors in promise constructor when Ember.onerror which does rethrow is present (Ember.testing = false) - rsvp`](
      assert
    ) {
      assert.expect(2);

      setTesting(false);
      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
        throw error;
      });

      window.onerror = function(message) {
        assert.pushResult({
          result: /the error/.test(message),
          actual: message,
          expected: 'to include `the error`',
          message:
            'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
        });

        // prevent "bubbling" and therefore failing the test
        return true;
      };

      new RSVP.Promise(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 10));
    }

    [`@test errors in promise .then callback when Ember.onerror which does not rethrow is present - rsvp`](
      assert
    ) {
      assert.expect(1);

      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
      });

      RSVP.resolve().then(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 10));
    }

    [`@test errors in promise .then callback when Ember.onerror which does rethrow is present - rsvp`](
      assert
    ) {
      assert.expect(2);

      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
        throw error;
      });

      window.onerror = function(message) {
        assert.pushResult({
          result: /the error/.test(message),
          actual: message,
          expected: 'to include `the error`',
          message:
            'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
        });

        // prevent "bubbling" and therefore failing the test
        return true;
      };

      RSVP.resolve().then(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 10));
    }

    [`@test errors in promise .then callback when Ember.onerror which does not rethrow is present (Ember.testing = false) - rsvp`](
      assert
    ) {
      assert.expect(1);

      setTesting(false);
      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
      });

      RSVP.resolve().then(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 10));
    }

    [`@test errors in promise .then callback when Ember.onerror which does rethrow is present (Ember.testing = false) - rsvp`](
      assert
    ) {
      assert.expect(2);

      setTesting(false);
      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
        throw error;
      });

      window.onerror = function(message) {
        assert.pushResult({
          result: /the error/.test(message),
          actual: message,
          expected: 'to include `the error`',
          message:
            'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
        });

        // prevent "bubbling" and therefore failing the test
        return true;
      };

      RSVP.resolve().then(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 10));
    }

    [`@test errors in async promise .then callback when Ember.onerror which does not rethrow is present - rsvp`](
      assert
    ) {
      assert.expect(1);

      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
      });

      new RSVP.Promise(resolve => setTimeout(resolve, 10)).then(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 20));
    }

    [`@test errors in async promise .then callback when Ember.onerror which does rethrow is present - rsvp`](
      assert
    ) {
      assert.expect(2);

      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
        throw error;
      });

      window.onerror = function(message) {
        assert.pushResult({
          result: /the error/.test(message),
          actual: message,
          expected: 'to include `the error`',
          message:
            'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
        });

        // prevent "bubbling" and therefore failing the test
        return true;
      };

      new RSVP.Promise(resolve => setTimeout(resolve, 10)).then(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 20));
    }

    [`@test errors in async promise .then callback when Ember.onerror which does not rethrow is present (Ember.testing = false) - rsvp`](
      assert
    ) {
      assert.expect(1);

      setTesting(false);
      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
      });

      new RSVP.Promise(resolve => setTimeout(resolve, 10)).then(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 20));
    }

    [`@test errors in async promise .then callback when Ember.onerror which does rethrow is present (Ember.testing = false) - rsvp`](
      assert
    ) {
      assert.expect(2);

      setTesting(false);
      let thrown = new Error('the error');
      setOnerror(function(error) {
        assert.strictEqual(
          error,
          thrown,
          'Ember.onerror is called for errors thrown in RSVP promises'
        );
        throw error;
      });

      window.onerror = function(message) {
        assert.pushResult({
          result: /the error/.test(message),
          actual: message,
          expected: 'to include `the error`',
          message:
            'error should bubble out to window.onerror, and therefore fail tests (due to QUnit implementing window.onerror)'
        });

        // prevent "bubbling" and therefore failing the test
        return true;
      };

      new RSVP.Promise(resolve => setTimeout(resolve, 10)).then(() => {
        throw thrown;
      });

      // RSVP.Promise's are configured to settle within the run loop, this
      // ensures that run loop has completed
      return new RSVP.Promise(resolve => setTimeout(resolve, 20));
    }
  }
);
