import Ember from 'ember';
import { run } from 'ember-metal';
import { DEBUG } from 'ember-env-flags';

const ONERROR = Ember.onerror;
const ADAPTER = Ember.Test && Ember.Test.adapter;
const TESTING = Ember.testing;

QUnit.module('error_handler', {
  teardown() {
    Ember.onerror = ONERROR;
    Ember.testing = TESTING;
    if (Ember.Test) {
      Ember.Test.adapter = ADAPTER;
    }
  }
});

function runThatThrows(message) {
  return run(() => {
    throw new Error(message);
  });
}

test('by default there is no onerror', function(assert) {
  Ember.onerror = undefined;
  assert.throws(runThatThrows, Error);
  assert.equal(Ember.onerror, undefined);
});

test('when Ember.onerror is registered', function(assert) {
  assert.expect(2);
  Ember.onerror = function(error) {
    assert.ok(true, 'onerror called');
    throw error;
  };
  assert.throws(runThatThrows, Error);
  // Ember.onerror = ONERROR;
});

if (DEBUG) {
  test('when Ember.Test.adapter is registered', function(assert) {
    assert.expect(2);

    Ember.Test.adapter = {
      exception(error) {
        assert.ok(true, 'adapter called');
        throw error;
      }
    };

    assert.throws(runThatThrows, Error);
  });

  test('when both Ember.onerror Ember.Test.adapter are registered', function(assert) {
    assert.expect(2);

    // takes precedence
    Ember.Test.adapter = {
      exception(error) {
        assert.ok(true, 'adapter called');
        throw error;
      }
    };

    Ember.onerror = function(error) {
      assert.ok(false, 'onerror was NEVER called');
      throw error;
    };

    assert.throws(runThatThrows, Error);
  });
}

QUnit.test('Ember.run does not swallow exceptions by default (Ember.testing = true)', function() {
  Ember.testing = true;
  let error = new Error('the error');
  throws(() => {
    Ember.run(() => {
      throw error;
    });
  }, error);
});

QUnit.test('Ember.run does not swallow exceptions by default (Ember.testing = false)', function() {
  Ember.testing = false;
  let error = new Error('the error');
  throws(() => {
    Ember.run(() => {
      throw error;
    });
  }, error);
});
