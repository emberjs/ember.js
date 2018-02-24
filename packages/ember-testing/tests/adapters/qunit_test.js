import { run } from 'ember-metal';
import QUnitAdapter from '../../adapters/qunit';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

var adapter;

moduleFor('ember-testing QUnitAdapter: QUnit 2.x', class extends AbstractTestCase {
  constructor() {
    super();
    this.originalStart = QUnit.start;
    this.originalStop = QUnit.stop;

    delete QUnit.start;
    delete QUnit.stop;

    adapter = new QUnitAdapter();
  }

  teardown() {
    run(adapter, adapter.destroy);

    QUnit.start = this.originalStart;
    QUnit.stop = this.originalStop;
  }

  ['@test asyncStart waits for asyncEnd to finish a test'](assert) {
    adapter.asyncStart();

    setTimeout(function() {
      assert.ok(true);
      adapter.asyncEnd();
    }, 50);
  }

  ['@test asyncStart waits for equal numbers of asyncEnd to finish a test'](assert) {
    let adapter = QUnitAdapter.create();

    adapter.asyncStart();
    adapter.asyncStart();
    adapter.asyncEnd();

    setTimeout(function() {
      assert.ok(true);
      adapter.asyncEnd();
    }, 50);
  }
});

