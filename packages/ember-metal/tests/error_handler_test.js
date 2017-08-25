import Ember from 'ember';
import { run } from 'ember-metal';

const ONERROR = Ember.onerror;
const ADAPTER = Ember.Test.adapter;

QUnit.module('error_handler', {
  afterEach() {
    Ember.onerror = ONERROR;
    Ember.Test.adapter = ADAPTER;
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
  assert.expect(1);
  Ember.error = function() {
    assert.ok(true, 'onerror called');
  };
  assert.throws(runThatThrows, Error);
});

test('when Ember.Test.adapter is registered', function(assert) {
  assert.expect(1);

  Ember.Test.adapter = function() {
    assert.ok(true, 'adapter called');
  };
  assert.throws(runThatThrows, Error);
});

test('when both Ember.onerror Ember.Test.adapter is registered', function(assert) {
  assert.expect(1);

  Ember.Test.adapter = function() {
    assert.ok(true, 'adapter called');
  };

  Ember.error = function() {
    assert.ok(false, 'onerror was NEVER called');
  };

  assert.throws(runThatThrows, Error);
});

