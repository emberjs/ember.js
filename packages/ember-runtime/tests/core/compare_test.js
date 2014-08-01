import {typeOf} from 'ember-metal/utils';
import EmberObject from 'ember-runtime/system/object';
import compare from 'ember-runtime/compare';
import Comparable from 'ember-runtime/mixins/comparable';

var data = [];
var Comp = EmberObject.extend(Comparable, {
  compare: function () {
    return this.get('val');
  }
});

QUnit.module('Ember.compare()', {
  setup: function() {
    data[0]  = null;
    data[1]  = false;
    data[2]  = true;
    data[3]  = -12;
    data[4]  = 3.5;
    data[5]  = 'a string';
    data[6]  = 'another string';
    data[7]  = 'last string';
    data[8]  = [1, 2];
    data[9]  = [1, 2, 3];
    data[10] = [1, 3];
    data[11] = {a: 'hash'};
    data[12] = EmberObject.create();
    data[13] = function (a) {return a;};
    data[14] = new Date('2012/01/01');
    data[15] = new Date('2012/06/06');
  }
});

test('ordering should work', function() {
  var suspect, comparable, failureMessage,
      suspectIndex, comparableIndex;

  for (suspectIndex = 0; suspectIndex < data.length; suspectIndex++) {
    suspect = data[suspectIndex];

    equal(compare(suspect, suspect), 0, suspectIndex + ' should equal itself');

    for (comparableIndex = suspectIndex + 1; comparableIndex < data.length; comparableIndex++) {
      comparable = data[comparableIndex];

      failureMessage = 'data[' + suspectIndex + '] (' + typeOf(suspect) +
        ') should be smaller than data[' + comparableIndex + '] (' +
        typeOf(comparable) + ')';

      equal(compare(suspect, comparable), -1, failureMessage);
    }
  }
});

test('comparables should return values in the range of -1, 0, 1', function() {
  var negOne = Comp.create({ val: -1 });
  var zero = Comp.create({ val: 0 });
  var one = Comp.create({ val: 1 });

  equal(compare(negOne, 'a'), -1, 'First item comparable - returns -1 (not negated)');
  equal(compare(zero, 'b'), 0, 'First item comparable - returns 0 (not negated)');
  equal(compare(one, 'c'), 1, 'First item comparable - returns 1 (not negated)');

  equal(compare('a', negOne), 1, 'Second item comparable - returns -1 (negated)');
  equal(compare('b', zero), 0, 'Second item comparable - returns 0 (negated)');
  equal(compare('c', one), -1, 'Second item comparable - returns 1 (negated)');
});
