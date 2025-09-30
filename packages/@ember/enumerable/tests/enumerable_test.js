import Enumerable from '@ember/enumerable';
import ArrayProxy from '@ember/array/proxy';
import { A } from '@ember/array';
import { moduleFor, AbstractTestCase, expectDeprecation } from 'internal-test-helpers';

moduleFor(
  'Enumerable',
  class extends AbstractTestCase {
    ['@test should be mixed into A()'](assert) {
      expectDeprecation(() => {
        assert.ok(Enumerable.detect(A()));
      }, /Usage of Ember.A is deprecated/);
    }

    ['@test should be mixed into ArrayProxy'](assert) {
      expectDeprecation(() => {
        assert.ok(Enumerable.detect(ArrayProxy.create()));
      }, /Usage of ArrayProxy is deprecated/);
    }
  }
);
