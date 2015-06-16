import { inspect } from 'ember-metal/utils';

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
