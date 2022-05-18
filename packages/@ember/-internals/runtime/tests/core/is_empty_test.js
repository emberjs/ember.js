import { isEmpty } from '@ember/utils';
import ArrayProxy from '@ember/array/proxy';
import ObjectProxy from '@ember/object/proxy';
import { A as emberA } from '@ember/array';
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
