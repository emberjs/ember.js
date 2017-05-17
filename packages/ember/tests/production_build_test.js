/* globals EmberDev */

import Ember from 'ember';

QUnit.module('production builds');

if (EmberDev && EmberDev.runningProdBuild) {
  QUnit.test('assert does not throw in production builds', function(assert) {
    assert.expect(1);

    try {
      Ember.assert('Should not throw');
      assert.ok(true, 'Ember.assert did not throw');
    } catch (e) {
      assert.ok(false, `Expected assert not to throw but it did: ${e.message}`);
    }
  });

  QUnit.test('runInDebug does not run the callback in production builds', function(assert) {
    let fired = false;
    Ember.runInDebug(() => fired = true);

    assert.equal(fired, false, 'runInDebug callback should not be ran');
  });
}
