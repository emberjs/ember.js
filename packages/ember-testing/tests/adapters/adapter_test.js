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
