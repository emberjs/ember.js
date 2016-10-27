import { environment } from 'ember-environment';
import {
  inspect,
  checkHasSuper,
  toString
} from 'ember-metal/utils';

QUnit.module('Ember Metal Utils');

QUnit.test('inspect outputs the toString() representation of Symbols', function() {
  if (typeof Symbol !== 'undefined') {
    let symbol = Symbol('test');
    equal(inspect(symbol), 'Symbol(test)');
  } else {
    expect(0);
  }
});

// Only run this test on browsers that we are certain should have function
// source available.  This allows the test suite to continue to pass on other
// platforms that correctly (for them) fall back to the "always wrap" code.
if (environment.isPhantom || environment.isChrome || environment.isFirefox) {
  QUnit.test('does not super wrap needlessly [GH #12462]', function(assert) {
    assert.notOk(checkHasSuper(function() {}), 'empty function does not have super');
  });
}

QUnit.test('toString uses an object\'s toString method when available', function() {
  let obj = {
    toString() {
      return 'bob';
    }
  };

  strictEqual(toString(obj), 'bob');
});


QUnit.test('toString falls back to Object.prototype.toString', function() {
  let obj = Object.create(null);

  strictEqual(toString(obj), {}.toString());
});
