import MutableEnumerable from '@ember/enumerable/mutable';
import { A } from '@ember/array';
import ArrayProxy from '@ember/array/proxy';
import { moduleFor, AbstractTestCase, expectDeprecation } from 'internal-test-helpers';
import { emberAWithoutDeprecation } from '@ember/routing/-internals';

moduleFor(
  'MutableEnumerable',
  class extends AbstractTestCase {
    ['@test should be mixed into A()'](assert) {
      expectDeprecation(() => {
        assert.ok(MutableEnumerable.detect(A()));
      }, /Usage of Ember.A is deprecated/);
    }

    ['@test should be mixed into ArrayProxy'](assert) {
      expectDeprecation(() => {
        assert.ok(MutableEnumerable.detect(ArrayProxy.create()));
      }, /Usage of ArrayProxy is deprecated/);
    }
  }
);
