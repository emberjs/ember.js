import { isEmpty } from 'ember-metal';
import ArrayProxy from '../../lib/system/array_proxy';
import { A as emberA } from '../../lib/mixins/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.isEmpty',
  class extends AbstractTestCase {
    ['@test Ember.isEmpty'](assert) {
      let arrayProxy = ArrayProxy.create({ content: emberA() });

      assert.equal(true, isEmpty(arrayProxy), 'for an ArrayProxy that has empty content');
    }
  }
);
