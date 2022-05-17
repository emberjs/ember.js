import MutableEnumerable from '@ember/enumerable/mutable';
import ArrayProxy from '@ember/array/proxy';
import { A } from '@ember/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'MutableEnumerable',
  class extends AbstractTestCase {
    ['@test should be mixed into A()'](assert) {
      assert.ok(MutableEnumerable.detect(A()));
    }

    ['@test should be mixed into ArrayProxy'](assert) {
      assert.ok(MutableEnumerable.detect(ArrayProxy.create()));
    }
  }
);
