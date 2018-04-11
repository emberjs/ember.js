import { setOnerror, getOnerror, run, schedule, next } from 'ember-metal';
import RSVP from '../../lib/ext/rsvp';
import { isTesting, setTesting } from 'ember-debug';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

const ORIGINAL_ONERROR = getOnerror();

moduleFor(
  'Ember.RSVP',
  class extends AbstractTestCase {
    afterEach() {
      setOnerror(ORIGINAL_ONERROR);
    }

    ['@test Ensure that errors thrown from within a promise are sent to the console'](assert) {
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
    }

    ['@test TransitionAborted errors are not re-thrown'](assert) {
      assert.expect(1);
      let fakeTransitionAbort = { name: 'TransitionAborted' };

      run(RSVP, 'reject', fakeTransitionAbort);

      assert.ok(true, 'did not throw an error when dealing with TransitionAborted');
    }

    ['@test Can reject with non-Error object'](assert) {
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
    }

    ['@test Can reject with no arguments'](assert) {
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
    }

    ['@test rejections like jqXHR which have errorThrown property work'](assert) {
      assert.expect(2);

      let wasEmberTesting = isTesting();
      let wasOnError = getOnerror();

      try {
        setTesting(false);
        setOnerror(error => {
          assert.equal(error, actualError, 'expected the real error on the jqXHR');
          assert.equal(
            error.__reason_with_error_thrown__,
            jqXHR,
            'also retains a helpful reference to the rejection reason'
          );
        });

        let actualError = new Error('OMG what really happened');
        let jqXHR = {
          errorThrown: actualError,
        };

        run(RSVP, 'reject', jqXHR);
      } finally {
        setOnerror(wasOnError);
        setTesting(wasEmberTesting);
      }
    }

    ['@test rejections where the errorThrown is a string should wrap the sting in an error object'](
      assert
    ) {
      assert.expect(2);

      let wasEmberTesting = isTesting();
      let wasOnError = getOnerror();

      try {
        setTesting(false);
        setOnerror(error => {
          assert.equal(error.message, actualError, 'expected the real error on the jqXHR');
          assert.equal(
            error.__reason_with_error_thrown__,
            jqXHR,
            'also retains a helpful reference to the rejection reason'
          );
        });

        let actualError = 'OMG what really happened';
        let jqXHR = {
          errorThrown: actualError,
        };

        run(RSVP, 'reject', jqXHR);
      } finally {
        setOnerror(wasOnError);
        setTesting(wasEmberTesting);
      }
    }

    ['@test rejections can be serialized to JSON'](assert) {
      assert.expect(2);

      let wasEmberTesting = isTesting();
      let wasOnError = getOnerror();

      try {
        setTesting(false);
        setOnerror(error => {
          assert.equal(error.message, 'a fail');
          assert.ok(JSON.stringify(error), 'Error can be serialized');
        });

        let jqXHR = {
          errorThrown: new Error('a fail'),
        };

        run(RSVP, 'reject', jqXHR);
      } finally {
        setOnerror(wasOnError);
        setTesting(wasEmberTesting);
      }
    }
  }
);

const reason = 'i failed';
function ajax() {
  return new RSVP.Promise(function(resolve) {
    setTimeout(resolve, 0); // fake true / foreign async
  });
}

moduleFor(
  'Ember.test: rejection assertions',
  class extends AbstractTestCase {
    ['@test unambigiously unhandled rejection'](assert) {
      assert.throws(function() {
        run(function() {
          RSVP.Promise.reject(reason);
        }); // something is funky, we should likely assert
      }, reason);
    }

    ['@test sync handled'](assert) {
      run(function() {
        RSVP.Promise.reject(reason).catch(function() {});
      }); // handled, we shouldn't need to assert.
      assert.ok(true, 'reached end of test');
    }

    ['@test handled within the same micro-task (via Ember.RVP.Promise)'](assert) {
      run(function() {
        let rejection = RSVP.Promise.reject(reason);
        RSVP.Promise.resolve(1).then(() => rejection.catch(function() {}));
      }); // handled, we shouldn't need to assert.
      assert.ok(true, 'reached end of test');
    }

    ['@test handled within the same micro-task (via direct run-loop)'](assert) {
      run(function() {
        let rejection = RSVP.Promise.reject(reason);
        schedule('afterRender', () => rejection.catch(function() {}));
      }); // handled, we shouldn't need to assert.
      assert.ok(true, 'reached end of test');
    }

    ['@test handled in the next microTask queue flush (next)'](assert) {
      assert.expect(2);
      let done = assert.async();

      assert.throws(function() {
        run(function() {
          let rejection = RSVP.Promise.reject(reason);

          next(() => {
            rejection.catch(function() {});
            assert.ok(true, 'reached end of test');
            done();
          });
        });
      }, reason);

      // a promise rejection survived a full flush of the run-loop without being handled
      // this is very likely an issue.
    }

    ['@test handled in the same microTask Queue flush do to data locality'](assert) {
      // an ambiguous scenario, this may or may not assert
      // it depends on the locality of `user#1`
      let store = {
        find() {
          return RSVP.Promise.resolve(1);
        },
      };
      run(function() {
        let rejection = RSVP.Promise.reject(reason);
        store.find('user', 1).then(() => rejection.catch(function() {}));
      });

      assert.ok(true, 'reached end of test');
    }

    ['@test handled in a different microTask Queue flush do to data locality'](assert) {
      let done = assert.async();
      // an ambiguous scenario, this may or may not assert
      // it depends on the locality of `user#1`
      let store = {
        find() {
          return ajax();
        },
      };
      assert.throws(function() {
        run(function() {
          let rejection = RSVP.Promise.reject(reason);
          store.find('user', 1).then(() => {
            rejection.catch(function() {});
            assert.ok(true, 'reached end of test');
            done();
          });
        });
      }, reason);
    }

    ['@test handled in the next microTask queue flush (ajax example)'](assert) {
      let done = assert.async();

      assert.throws(function() {
        run(function() {
          let rejection = RSVP.Promise.reject(reason);
          ajax().then(() => {
            rejection.catch(function() {});
            assert.ok(true, 'reached end of test');
            done();
          });
        });
      }, reason);
    }
  }
);
