import { run } from '@ember/runloop';
import { computed, objectAt } from 'ember-metal';
import ArrayProxy from '../../../lib/system/array_proxy';
import { A as emberA } from '../../../lib/mixins/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let array;

moduleFor(
  'ArrayProxy - arrangedContent',
  class extends AbstractTestCase {
    beforeEach() {
      run(() => {
        array = ArrayProxy.extend({
          arrangedContent: computed('content.[]', function() {
            let content = this.get('content');
            return (
              content &&
              emberA(
                content.slice().sort((a, b) => {
                  if (a == null) {
                    a = -1;
                  }
                  if (b == null) {
                    b = -1;
                  }
                  return b - a;
                })
              )
            );
          }),
        }).create({
          content: emberA([1, 2, 4, 5]),
        });
      });
    }

    afterEach() {
      run(() => array.destroy());
    }

    ['@test compact - returns arrangedContent without nulls and undefined'](assert) {
      run(() => array.set('content', emberA([1, 3, null, 2, undefined])));

      assert.deepEqual(array.compact(), [3, 2, 1]);
    }

    ['@test indexOf - returns index of object in arrangedContent'](assert) {
      assert.equal(array.indexOf(4), 1, 'returns arranged index');
    }

    ['@test lastIndexOf - returns last index of object in arrangedContent'](assert) {
      array.get('content').pushObject(4);
      assert.equal(array.lastIndexOf(4), 2, 'returns last arranged index');
    }

    ['@test objectAt - returns object at index in arrangedContent'](assert) {
      assert.equal(objectAt(array, 1), 4, 'returns object at index');
    }

    // Not sure if we need a specific test for it, since it's internal
    ['@test objectAtContent - returns object at index in arrangedContent'](assert) {
      assert.equal(array.objectAtContent(1), 4, 'returns object at index');
    }

    ['@test objectsAt - returns objects at indices in arrangedContent'](assert) {
      assert.deepEqual(array.objectsAt([0, 2, 4]), [5, 2, undefined], 'returns objects at indices');
    }

    ['@test replace - mutating an arranged ArrayProxy is not allowed']() {
      expectAssertion(() => {
        array.replace(0, 0, [3]);
      }, /Mutating an arranged ArrayProxy is not allowed/);
    }

    ['@test replaceContent - does a standard array replace on content'](assert) {
      run(() => array.replaceContent(1, 2, [3]));
      assert.deepEqual(array.get('content'), [1, 3, 5]);
    }

    ['@test slice - returns a slice of the arrangedContent'](assert) {
      assert.deepEqual(array.slice(1, 3), [4, 2], 'returns sliced arrangedContent');
    }

    ['@test toArray - returns copy of arrangedContent'](assert) {
      assert.deepEqual(array.toArray(), [5, 4, 2, 1]);
    }

    ['@test without - returns arrangedContent without object'](assert) {
      assert.deepEqual(array.without(2), [5, 4, 1], 'returns arranged without object');
    }

    ['@test lastObject - returns last arranged object'](assert) {
      assert.equal(array.get('lastObject'), 1, 'returns last arranged object');
    }

    ['@test firstObject - returns first arranged object'](assert) {
      assert.equal(array.get('firstObject'), 5, 'returns first arranged object');
    }
  }
);

moduleFor(
  'ArrayProxy - arrangedContent matching content',
  class extends AbstractTestCase {
    beforeEach() {
      run(function() {
        array = ArrayProxy.create({
          content: emberA([1, 2, 4, 5]),
        });
      });
    }

    afterEach() {
      run(function() {
        array.destroy();
      });
    }

    ['@test insertAt - inserts object at specified index'](assert) {
      run(function() {
        array.insertAt(2, 3);
      });
      assert.deepEqual(array.get('content'), [1, 2, 3, 4, 5]);
    }

    ['@test replace - does a standard array replace'](assert) {
      run(function() {
        array.replace(1, 2, [3]);
      });
      assert.deepEqual(array.get('content'), [1, 3, 5]);
    }

    ['@test reverseObjects - reverses content'](assert) {
      run(function() {
        array.reverseObjects();
      });
      assert.deepEqual(array.get('content'), [5, 4, 2, 1]);
    }
  }
);

moduleFor(
  'ArrayProxy - arrangedContent with transforms',
  class extends AbstractTestCase {
    beforeEach() {
      run(function() {
        array = ArrayProxy.extend({
          arrangedContent: computed(function() {
            let content = this.get('content');
            return (
              content &&
              emberA(
                content.slice().sort(function(a, b) {
                  if (a == null) {
                    a = -1;
                  }
                  if (b == null) {
                    b = -1;
                  }
                  return b - a;
                })
              )
            );
          }).property('content.[]'),

          objectAtContent(idx) {
            let obj = objectAt(this.get('arrangedContent'), idx);
            return obj && obj.toString();
          },
        }).create({
          content: emberA([1, 2, 4, 5]),
        });
      });
    }

    afterEach() {
      run(function() {
        array.destroy();
      });
    }

    ['@test indexOf - returns index of object in arrangedContent'](assert) {
      assert.equal(array.indexOf('4'), 1, 'returns arranged index');
    }

    ['@test lastIndexOf - returns last index of object in arrangedContent'](assert) {
      array.get('content').pushObject(4);
      assert.equal(array.lastIndexOf('4'), 2, 'returns last arranged index');
    }

    ['@test objectAt - returns object at index in arrangedContent'](assert) {
      assert.equal(objectAt(array, 1), '4', 'returns object at index');
    }

    // Not sure if we need a specific test for it, since it's internal
    ['@test objectAtContent - returns object at index in arrangedContent'](assert) {
      assert.equal(array.objectAtContent(1), '4', 'returns object at index');
    }

    ['@test objectsAt - returns objects at indices in arrangedContent'](assert) {
      assert.deepEqual(
        array.objectsAt([0, 2, 4]),
        ['5', '2', undefined],
        'returns objects at indices'
      );
    }

    ['@test slice - returns a slice of the arrangedContent'](assert) {
      assert.deepEqual(array.slice(1, 3), ['4', '2'], 'returns sliced arrangedContent');
    }

    ['@test toArray - returns copy of arrangedContent'](assert) {
      assert.deepEqual(array.toArray(), ['5', '4', '2', '1']);
    }

    ['@test without - returns arrangedContent without object'](assert) {
      assert.deepEqual(array.without('2'), ['5', '4', '1'], 'returns arranged without object');
    }

    ['@test lastObject - returns last arranged object'](assert) {
      assert.equal(array.get('lastObject'), '1', 'returns last arranged object');
    }

    ['@test firstObject - returns first arranged object'](assert) {
      assert.equal(array.get('firstObject'), '5', 'returns first arranged object');
    }
  }
);

moduleFor(
  'ArrayProxy - with transforms',
  class extends AbstractTestCase {
    beforeEach() {
      run(function() {
        array = ArrayProxy.extend({
          objectAtContent(idx) {
            let obj = objectAt(this.get('arrangedContent'), idx);
            return obj && obj.toString();
          },
        }).create({
          content: emberA([1, 2, 4, 5]),
        });
      });
    }

    afterEach() {
      run(function() {
        array.destroy();
      });
    }

    ['@test popObject - removes last object in arrangedContent'](assert) {
      let popped = array.popObject();
      assert.equal(popped, '5', 'returns last object');
      assert.deepEqual(array.toArray(), ['1', '2', '4'], 'removes from content');
    }

    ['@test removeObject - removes object from content'](assert) {
      array.removeObject('2');
      assert.deepEqual(array.toArray(), ['1', '4', '5']);
    }

    ['@test removeObjects - removes objects from content'](assert) {
      array.removeObjects(['2', '4', '6']);
      assert.deepEqual(array.toArray(), ['1', '5']);
    }

    ['@test shiftObject - removes from start of arrangedContent'](assert) {
      let shifted = array.shiftObject();
      assert.equal(shifted, '1', 'returns first object');
      assert.deepEqual(array.toArray(), ['2', '4', '5'], 'removes object from content');
    }
  }
);
