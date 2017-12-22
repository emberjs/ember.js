import { run } from 'ember-metal';
import QUnitAdapter from '../../adapters/qunit';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

var adapter;

moduleFor('ember-testing QUnitAdapter', class extends AbstractTestCase {
  constructor() {
    super();
    adapter = new QUnitAdapter();
  }

  teardown() {
    run(adapter, adapter.destroy);
  }

  ['@test asyncStart calls stop'](assert) {
    var originalStop = QUnit.stop;
    try {
      QUnit.stop = function() {
        assert.ok(true, 'stop called');
      };
      adapter.asyncStart();
    } finally {
      QUnit.stop = originalStop;
    }
  }

  ['@test asyncEnd calls start'](assert) {
    var originalStart = QUnit.start;
    try {
      QUnit.start = function() {
        assert.ok(true, 'start called');
      };
      adapter.asyncEnd();
    } finally {
      QUnit.start = originalStart;
    }
  }

  ['@test exception causes a failing assertion']() {
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
  }
});

