import { run } from 'ember-metal';
import Adapter from '../../adapters/adapter';

var adapter;

QUnit.module('ember-testing Adapter', {
  setup() {
    adapter = new Adapter();
  },
  teardown() {
    run(adapter, adapter.destroy);
  }
});

// Can't test these this way anymore since we have nothing to compare to
// test("asyncStart is a noop", function() {
//   equal(adapter.asyncStart, K);
// });

// test("asyncEnd is a noop", function() {
//   equal(adapter.asyncEnd, K);
// });

QUnit.test('exception throws', function() {
  var error = 'Hai';
  var thrown;

  try {
    adapter.exception(error);
  } catch (e) {
    thrown = e;
  }
  equal(thrown, error);
});
