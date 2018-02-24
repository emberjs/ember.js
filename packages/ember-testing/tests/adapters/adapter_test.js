import { run } from 'ember-metal';
import Adapter from '../../adapters/adapter';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

var adapter;

moduleFor('ember-testing Adapter', class extends AbstractTestCase {
  constructor() {
    super();
    adapter = new Adapter();
  }

  teardown() {
    run(adapter, adapter.destroy);
  }

  ['@test exception throws'](assert) {
    var error = 'Hai';
    var thrown;

    try {
      adapter.exception(error);
    } catch (e) {
      thrown = e;
    }
    assert.equal(thrown, error);
  }

});

