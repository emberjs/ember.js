import {
  setOnerror,
  getOnerror,
  run
} from 'ember-metal';
import RSVP from '../../ext/rsvp';
import { isTesting, setTesting } from 'ember-debug';

const ORIGINAL_ONERROR = getOnerror();

QUnit.module('Ember.RSVP', {
  afterEach() {
    setOnerror(ORIGINAL_ONERROR);
  }
});

QUnit.test('Ensure that errors thrown from within a promise are sent to the console', function(assert) {
  let error = new Error('Error thrown in a promise for testing purposes.');

  try {
    run(function() {
      new RSVP.Promise(function() {
        throw error;
      });
    });
    assert.ok(false, 'expected assertion to be thrown');
  } catch (e) {
    assert.equal(e, error, 'error was re-thrown');
  }
});

QUnit.test('TransitionAborted errors are not re-thrown', function(assert) {
  assert.expect(1);
  let fakeTransitionAbort = { name: 'TransitionAborted' };

  run(RSVP, 'reject', fakeTransitionAbort);

  assert.ok(true, 'did not throw an error when dealing with TransitionAborted');
});

QUnit.test('Can reject with non-Error object', function(assert) {
  let wasEmberTesting = isTesting();
  setTesting(false);
  assert.expect(1);

  try {
    run(RSVP, 'reject', 'foo');
  } catch (e) {
    assert.equal(e, 'foo', 'should throw with rejection message');
  } finally {
    setTesting(wasEmberTesting);
  }
});

QUnit.test('Can reject with no arguments', function(assert) {
  let wasEmberTesting = isTesting();
  setTesting(false);
  assert.expect(1);

  try {
    run(RSVP, 'reject');
  } catch (e) {
    assert.ok(false, 'should not throw');
  } finally {
    setTesting(wasEmberTesting);
  }

  assert.ok(true);
});

QUnit.test('rejections like jqXHR which have errorThrown property work', function(assert) {
  assert.expect(2);

  let wasEmberTesting = isTesting();
  let wasOnError      = getOnerror();

  try {
    setTesting(false);
    setOnerror(error => {
      assert.equal(error, actualError, 'expected the real error on the jqXHR');
      assert.equal(error.__reason_with_error_thrown__, jqXHR, 'also retains a helpful reference to the rejection reason');
    });

    let actualError = new Error('OMG what really happened');
    let jqXHR = {
      errorThrown: actualError
    };

    run(RSVP, 'reject', jqXHR);
  } finally {
    setOnerror(wasOnError);
    setTesting(wasEmberTesting);
  }
});

QUnit.test('rejections where the errorThrown is a string should wrap the sting in an error object', function(assert) {
  assert.expect(2);

  let wasEmberTesting = isTesting();
  let wasOnError      = getOnerror();

  try {
    setTesting(false);
    setOnerror(error => {
      assert.equal(error.message, actualError, 'expected the real error on the jqXHR');
      assert.equal(error.__reason_with_error_thrown__, jqXHR, 'also retains a helpful reference to the rejection reason');
    });

    let actualError = 'OMG what really happened';
    let jqXHR = {
      errorThrown: actualError
    };

    run(RSVP, 'reject', jqXHR);
  } finally {
    setOnerror(wasOnError);
    setTesting(wasEmberTesting);
  }
});

QUnit.test('rejections can be serialized to JSON', function (assert) {
  assert.expect(2);

  let wasEmberTesting = isTesting();
  let wasOnError      = getOnerror();

  try {
    setTesting(false);
    setOnerror(error => {
      assert.equal(error.message, 'a fail');
      assert.ok(JSON.stringify(error), 'Error can be serialized');
    });

    let jqXHR = {
      errorThrown: new Error('a fail')
    };

    run(RSVP, 'reject', jqXHR);
  } finally {
    setOnerror(wasOnError);
    setTesting(wasEmberTesting);
  }
});

const reason = 'i failed';
QUnit.module('Ember.test: rejection assertions');

function ajax() {
  return RSVP.Promise(function(resolve) {
    QUnit.stop();
    setTimeout(function() {
      QUnit.start();
      resolve();
    }, 0); // fake true / foreign async
  });
}

QUnit.test('unambigiously unhandled rejection', function(assert) {
  assert.throws(function() {
    run(function() {
      RSVP.Promise.reject(reason);
    }); // something is funky, we should likely assert
  }, reason);
});

QUnit.test('sync handled', function(assert) {
  run(function() {
    RSVP.Promise.reject(reason).catch(function() { });
  }); // handled, we shouldn't need to assert.
  assert.ok(true, 'reached end of test');
});

QUnit.test('handled within the same micro-task (via Ember.RVP.Promise)', function(assert) {
  run(function() {
    let rejection = RSVP.Promise.reject(reason);
    RSVP.Promise.resolve(1).then(() => rejection.catch(function() { }));
  }); // handled, we shouldn't need to assert.
  assert.ok(true, 'reached end of test');
});

QUnit.test('handled within the same micro-task (via direct run-loop)', function(assert) {
  run(function() {
    let rejection = RSVP.Promise.reject(reason);
    run.schedule('afterRender', () => rejection.catch(function() { }));
  }); // handled, we shouldn't need to assert.
  assert.ok(true, 'reached end of test');
});

QUnit.test('handled in the next microTask queue flush (run.next)', function(assert) {
  assert.expect(2);

  assert.throws(function() {
    run(function() {
      let rejection = RSVP.Promise.reject(reason);

      QUnit.stop();
      run.next(() => {
        QUnit.start();
        rejection.catch(function() { });
        assert.ok(true, 'reached end of test');
      });
    });
  }, reason);

  // a promise rejection survived a full flush of the run-loop without being handled
  // this is very likely an issue.
});

QUnit.test('handled in the same microTask Queue flush do to data locality', function(assert) {
  // an ambiguous scenario, this may or may not assert
  // it depends on the locality of `user#1`
  let store = {
    find() {
      return RSVP.Promise.resolve(1);
    }
  };
  run(function() {
    let rejection = RSVP.Promise.reject(reason);
    store.find('user', 1).then(() => rejection.catch(function() { }));
  });

  assert.ok(true, 'reached end of test');
});

QUnit.test('handled in a different microTask Queue flush do to data locality', function(assert) {
  // an ambiguous scenario, this may or may not assert
  // it depends on the locality of `user#1`
  let store = {
    find() {
      return ajax();
    }
  };
  assert.throws(function() {
    run(function() {
      let rejection = RSVP.Promise.reject(reason);
      store.find('user', 1).then(() => {
        rejection.catch(function() { });
        assert.ok(true, 'reached end of test');
      });
    });
  }, reason);
});

QUnit.test('handled in the next microTask queue flush (ajax example)', function(assert) {
  assert.throws(function() {
    run(function() {
      let rejection = RSVP.Promise.reject(reason);
      ajax('/something/').then(() => {
        rejection.catch(function() {});
        assert.ok(true, 'reached end of test');
      });
    });
  }, reason);
});
