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

  ['@test exception causes a failing assertion'](assert) {
    var error = { err: 'hai' };
    let originalPushResult = assert.pushResult;
    try {
      assert.pushResult = function (resultInfo) {
        // Inverts the result so we can test failing assertions
        resultInfo.result = !resultInfo.result;
        resultInfo.message = `Failed: ${resultInfo.message}`;
        originalPushResult(resultInfo);
      };
      adapter.exception(error);
    } finally {
      assert.pushResult = originalPushResult;
    }
  }
});

