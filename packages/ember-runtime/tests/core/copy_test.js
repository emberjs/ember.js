import copy from 'ember-runtime/copy';

QUnit.module('Ember Copy Method');

QUnit.test('Ember.copy null', function() {
  var obj = { field: null };

  equal(copy(obj, true).field, null, 'null should still be null');
});

QUnit.test('Ember.copy date', function() {
  var date = new Date(2014, 7, 22);
  var dateCopy = copy(date);

  equal(date.getTime(), dateCopy.getTime(), 'dates should be equivalent');
});

QUnit.test('Ember.copy null prototype object', function() {
  var obj = Object.create(null);

  obj.foo = 'bar';

  equal(copy(obj).foo, 'bar', 'bar should still be bar');
});
