import { isGlobalPath } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('Ember.isGlobalPath', class extends AbstractTestCase {
  ['@test global path\'s are recognized'](assert) {
    assert.ok(isGlobalPath('App.myProperty'));
    assert.ok(isGlobalPath('App.myProperty.subProperty'));
  }

  ['@test if there is a \'this\' in the path, it\'s not a global path'](assert) {
    assert.ok(!isGlobalPath('this.myProperty'));
    assert.ok(!isGlobalPath('this'));
  }

  ['@test if the path starts with a lowercase character, it is not a global path'](assert) {
    assert.ok(!isGlobalPath('myObj'));
    assert.ok(!isGlobalPath('myObj.SecondProperty'));
  }
});

