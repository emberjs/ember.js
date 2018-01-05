import copy from '../../copy';

QUnit.module('Ember Copy Method');

QUnit.test('Ember.copy null', function(assert) {
  let obj = { field: null };

  assert.equal(copy(obj, true).field, null, 'null should still be null');
});

QUnit.test('Ember.copy date', function(assert) {
  let date = new Date(2014, 7, 22);
  let dateCopy = copy(date);

  assert.equal(date.getTime(), dateCopy.getTime(), 'dates should be equivalent');
});

QUnit.test('Ember.copy null prototype object', function(assert) {
  let obj = Object.create(null);

  obj.foo = 'bar';

  assert.equal(copy(obj).foo, 'bar', 'bar should still be bar');
});

QUnit.test('Ember.copy Array', function(assert) {
  let array = [1, null, new Date(2015, 9, 9), 'four'];
  let arrayCopy = copy(array);

  assert.deepEqual(array, arrayCopy, 'array content cloned successfully in new array');
});
