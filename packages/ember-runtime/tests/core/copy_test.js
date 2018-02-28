import copy from '../../copy';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('Ember Copy Method', class extends AbstractTestCase {
  
  ['@test Ember.copy null'](assert) {
    let obj = { field: null };
  
    assert.equal(copy(obj, true).field, null, 'null should still be null');
  }
  
  ['@test Ember.copy date'](assert) {
    let date = new Date(2014, 7, 22);
    let dateCopy = copy(date);
  
    assert.equal(date.getTime(), dateCopy.getTime(), 'dates should be equivalent');
  }
  
  ['@test Ember.copy null prototype object'](assert) {
    let obj = Object.create(null);
  
    obj.foo = 'bar';
  
    assert.equal(copy(obj).foo, 'bar', 'bar should still be bar');
  }
  
  ['@test Ember.copy Array'](assert) {
    let array = [1, null, new Date(2015, 9, 9), 'four'];
    let arrayCopy = copy(array);
  
    assert.deepEqual(array, arrayCopy, 'array content cloned successfully in new array');
  }
});


