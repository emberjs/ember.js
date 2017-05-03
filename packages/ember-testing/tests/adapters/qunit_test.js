import { run } from 'ember-metal';
import QUnitAdapter from '../../adapters/qunit';

var adapter;

QUnit.module('ember-testing QUnitAdapter', {
  setup() {
    adapter = new QUnitAdapter();
  },
  teardown() {
    run(adapter, adapter.destroy);
  }
});

QUnit.test('can still do assertions after asyncEnd', function() {
  adapter.asyncStart();
  adapter.asyncEnd();
  ok(true);
});

QUnit.test('asyncStart waits for asyncEnd to finish a test', function() {
  adapter.asyncStart();
  setTimeout(function() {
    ok(true);
    adapter.asyncEnd();
  }, 50);
});

QUnit.test('exception causes a failing assertion', function() {
  var error = { err: 'hai' };
  var originalOk = window.ok;
  try {
    window.ok = function(val, msg) {
      originalOk(!val, 'ok is called with false');
      originalOk(msg, '{err: "hai"}');
    };
    adapter.exception(error);
  } finally {
    window.ok = originalOk;
  }
});
