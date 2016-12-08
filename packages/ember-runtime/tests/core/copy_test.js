import copy from '../../copy';

QUnit.module('Ember Copy Method');

QUnit.test('Ember.copy null', function() {
  let obj = { field: null };

  equal(copy(obj, true).field, null, 'null should still be null');
});

QUnit.test('Ember.copy date', function() {
  let date = new Date(2014, 7, 22);
  let dateCopy = copy(date);

  equal(date.getTime(), dateCopy.getTime(), 'dates should be equivalent');
});

QUnit.test('Ember.copy null prototype object', function() {
  let obj = Object.create(null);

  obj.foo = 'bar';

  equal(copy(obj).foo, 'bar', 'bar should still be bar');
});

QUnit.test('Ember.copy Array', function() {
  let array = [1, null, new Date(2015, 9, 9), 'four'];
  let arrayCopy = copy(array);

  deepEqual(array, arrayCopy, 'array content cloned successfully in new array');
});
