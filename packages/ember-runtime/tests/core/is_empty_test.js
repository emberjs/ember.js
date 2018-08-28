import { isEmpty } from 'ember-metal';
import ArrayProxy from '../../lib/system/array_proxy';
import ObjectProxy from '../../lib/system/object_proxy';
import { A as emberA } from '../../lib/mixins/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.isEmpty',
  class extends AbstractTestCase {
    ['@test Ember.isEmpty ArrayProxy'](assert) {
      let arrayProxy = ArrayProxy.create({ content: emberA() });

      assert.equal(true, isEmpty(arrayProxy), 'for an ArrayProxy that has empty content');
    }

    ['@test Ember.isEmpty ObjectProxy ArrayProxy'](assert) {
      let arrayProxy = ArrayProxy.create({ content: emberA([]) });
      let objectProxy = ObjectProxy.create({ content: arrayProxy });

      assert.equal(
        true,
        isEmpty(objectProxy),
        'for an ArrayProxy inside ObjectProxy that has empty content'
      );
    }
  }
);
