import { run } from '@ember/runloop';
import Adapter from '../../lib/adapters/adapter';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let adapter;

moduleFor(
  'ember-testing Adapter',
  class extends AbstractTestCase {
    constructor() {
      super();
      adapter = Adapter.create();
    }

    teardown() {
      run(adapter, adapter.destroy);
    }

    ['@test exception throws'](assert) {
      let error = 'Hai';
      let thrown;

      try {
        adapter.exception(error);
      } catch (e) {
        thrown = e;
      }
      assert.equal(thrown, error);
    }
  }
);
