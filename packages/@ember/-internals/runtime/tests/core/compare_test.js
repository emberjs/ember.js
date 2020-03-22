import { typeOf } from '../../lib/type-of';
import EmberObject from '../../lib/system/object';
import compare from '../../lib/compare';
import Comparable from '../../lib/mixins/comparable';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let data = [];
let Comp = EmberObject.extend(Comparable);

Comp.reopenClass({
  compare(obj) {
    return obj.get('val');
  },
});

moduleFor(
  'Ember.compare()',
  class extends AbstractTestCase {
    beforeEach() {
      data[0] = null;
      data[1] = false;
      data[2] = true;
      data[3] = -12;
      data[4] = 3.5;
      data[5] = 'a string';
      data[6] = 'another string';
      data[7] = 'last string';
      data[8] = [1, 2];
      data[9] = [1, 2, 3];
      data[10] = [1, 3];
      data[11] = { a: 'hash' };
      data[12] = EmberObject.create();
      data[13] = function(a) {
        return a;
      };
      data[14] = new Date('2012/01/01');
      data[15] = new Date('2012/06/06');
    }

    ['@test ordering should work'](assert) {
      let suspect, comparable, failureMessage, suspectIndex, comparableIndex;

      for (suspectIndex = 0; suspectIndex < data.length; suspectIndex++) {
        suspect = data[suspectIndex];

        assert.equal(compare(suspect, suspect), 0, suspectIndex + ' should equal itself');

        for (comparableIndex = suspectIndex + 1; comparableIndex < data.length; comparableIndex++) {
          comparable = data[comparableIndex];

          failureMessage =
            'data[' +
            suspectIndex +
            '] (' +
            typeOf(suspect) +
            ') should be smaller than data[' +
            comparableIndex +
            '] (' +
            typeOf(comparable) +
            ')';

          assert.equal(compare(suspect, comparable), -1, failureMessage);
        }
      }
    }

    ['@test comparables should return values in the range of -1, 0, 1'](assert) {
      let negOne = Comp.create({
        val: -1,
      });

      let zero = Comp.create({
        val: 0,
      });

      let one = Comp.create({
        val: 1,
      });

      assert.equal(compare(negOne, 'a'), -1, 'First item comparable - returns -1 (not negated)');
      assert.equal(compare(zero, 'b'), 0, 'First item comparable - returns  0 (not negated)');
      assert.equal(compare(one, 'c'), 1, 'First item comparable - returns  1 (not negated)');

      assert.equal(compare('a', negOne), 1, 'Second item comparable - returns -1 (negated)');
      assert.equal(compare('b', zero), 0, 'Second item comparable - returns  0 (negated)');
      assert.equal(compare('c', one), -1, 'Second item comparable - returns  1 (negated)');
    }
  }
);
