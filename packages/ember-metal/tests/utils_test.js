import { inspect, checkHasSuper } from 'ember-metal/utils';
import environment from 'ember-metal/environment';

QUnit.module('Ember Metal Utils');

QUnit.test('inspect outputs the toString() representation of Symbols', function() {
  // Symbol is not defined on pre-ES2015 runtimes, so this let's us safely test
  // for it's existence (where a simple `if (Symbol)` would ReferenceError)
  let Symbol = Symbol || null;

  if (Symbol) {
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
