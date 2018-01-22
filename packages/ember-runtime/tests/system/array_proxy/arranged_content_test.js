import { run, computed } from 'ember-metal';
import ArrayProxy from '../../../system/array_proxy';
import { A as emberA } from '../../../system/native_array';
import { objectAt } from '../../../mixins/array';

let array;

QUnit.module('ArrayProxy - arrangedContent', {
  beforeEach() {
    run(() => {
      array = ArrayProxy.extend({
        arrangedContent: computed('content.[]', function() {
          let content = this.get('content');
          return content && emberA(content.slice().sort((a, b) => {
            if (a == null) { a = -1; }
            if (b == null) { b = -1; }
            return b - a;
          }));
        })
      }).create({
        content: emberA([1, 2, 4, 5])
      });
    });
  },
  afterEach() {
    run(() => array.destroy());
  }
});

QUnit.test('compact - returns arrangedContent without nulls and undefined', function(assert) {
  run(() => array.set('content', emberA([1, 3, null, 2, undefined])));

  assert.deepEqual(array.compact(), [3, 2, 1]);
});

QUnit.test('indexOf - returns index of object in arrangedContent', function(assert) {
  assert.equal(array.indexOf(4), 1, 'returns arranged index');
});

QUnit.test('lastIndexOf - returns last index of object in arrangedContent', function(assert) {
  array.get('content').pushObject(4);
  assert.equal(array.lastIndexOf(4), 2, 'returns last arranged index');
});

QUnit.test('objectAt - returns object at index in arrangedContent', function(assert) {
  assert.equal(objectAt(array, 1), 4, 'returns object at index');
});

// Not sure if we need a specific test for it, since it's internal
QUnit.test('objectAtContent - returns object at index in arrangedContent', function(assert) {
  assert.equal(array.objectAtContent(1), 4, 'returns object at index');
});

QUnit.test('objectsAt - returns objects at indices in arrangedContent', function(assert) {
  assert.deepEqual(array.objectsAt([0, 2, 4]), [5, 2, undefined], 'returns objects at indices');
});

QUnit.test('replace - mutating an arranged ArrayProxy is not allowed', function() {
  expectAssertion(() => {
    array.replace(0, 0, [3]);
  }, /Mutating an arranged ArrayProxy is not allowed/);
});

QUnit.test('replaceContent - does a standard array replace on content', function(assert) {
  run(() => array.replaceContent(1, 2, [3]));
  assert.deepEqual(array.get('content'), [1, 3, 5]);
});

QUnit.test('slice - returns a slice of the arrangedContent', function(assert) {
  assert.deepEqual(array.slice(1, 3), [4, 2], 'returns sliced arrangedContent');
});

QUnit.test('toArray - returns copy of arrangedContent', function(assert) {
  assert.deepEqual(array.toArray(), [5, 4, 2, 1]);
});

QUnit.test('without - returns arrangedContent without object', function(assert) {
  assert.deepEqual(array.without(2), [5, 4, 1], 'returns arranged without object');
});

QUnit.test('lastObject - returns last arranged object', function(assert) {
  assert.equal(array.get('lastObject'), 1, 'returns last arranged object');
});

QUnit.test('firstObject - returns first arranged object', function(assert) {
  assert.equal(array.get('firstObject'), 5, 'returns first arranged object');
});


QUnit.module('ArrayProxy - arrangedContent matching content', {
  beforeEach() {
    run(function() {
      array = ArrayProxy.create({
        content: emberA([1, 2, 4, 5])
      });
    });
  },
  afterEach() {
    run(function() {
      array.destroy();
    });
  }
});

QUnit.test('insertAt - inserts object at specified index', function(assert) {
  run(function() { array.insertAt(2, 3); });
  assert.deepEqual(array.get('content'), [1, 2, 3, 4, 5]);
});

QUnit.test('replace - does a standard array replace', function(assert) {
  run(function() { array.replace(1, 2, [3]); });
  assert.deepEqual(array.get('content'), [1, 3, 5]);
});

QUnit.test('reverseObjects - reverses content', function(assert) {
  run(function() { array.reverseObjects(); });
  assert.deepEqual(array.get('content'), [5, 4, 2, 1]);
});

QUnit.module('ArrayProxy - arrangedContent with transforms', {
  beforeEach() {
    run(function() {
      array = ArrayProxy.extend({
        arrangedContent: computed(function() {
          let content = this.get('content');
          return content && emberA(content.slice().sort(function(a, b) {
            if (a == null) { a = -1; }
            if (b == null) { b = -1; }
            return b - a;
          }));
        }).property('content.[]'),

        objectAtContent(idx) {
          let obj = objectAt(this.get('arrangedContent'), idx);
          return obj && obj.toString();
        }
      }).create({
        content: emberA([1, 2, 4, 5])
      });
    });
  },
  afterEach() {
    run(function() {
      array.destroy();
    });
  }
});

QUnit.test('indexOf - returns index of object in arrangedContent', function(assert) {
  assert.equal(array.indexOf('4'), 1, 'returns arranged index');
});

QUnit.test('lastIndexOf - returns last index of object in arrangedContent', function(assert) {
  array.get('content').pushObject(4);
  assert.equal(array.lastIndexOf('4'), 2, 'returns last arranged index');
});

QUnit.test('objectAt - returns object at index in arrangedContent', function(assert) {
  assert.equal(objectAt(array, 1), '4', 'returns object at index');
});

// Not sure if we need a specific test for it, since it's internal
QUnit.test('objectAtContent - returns object at index in arrangedContent', function(assert) {
  assert.equal(array.objectAtContent(1), '4', 'returns object at index');
});

QUnit.test('objectsAt - returns objects at indices in arrangedContent', function(assert) {
  assert.deepEqual(array.objectsAt([0, 2, 4]), ['5', '2', undefined], 'returns objects at indices');
});

QUnit.test('slice - returns a slice of the arrangedContent', function(assert) {
  assert.deepEqual(array.slice(1, 3), ['4', '2'], 'returns sliced arrangedContent');
});

QUnit.test('toArray - returns copy of arrangedContent', function(assert) {
  assert.deepEqual(array.toArray(), ['5', '4', '2', '1']);
});

QUnit.test('without - returns arrangedContent without object', function(assert) {
  assert.deepEqual(array.without('2'), ['5', '4', '1'], 'returns arranged without object');
});

QUnit.test('lastObject - returns last arranged object', function(assert) {
  assert.equal(array.get('lastObject'), '1', 'returns last arranged object');
});

QUnit.test('firstObject - returns first arranged object', function(assert) {
  assert.equal(array.get('firstObject'), '5', 'returns first arranged object');
});

QUnit.module('ArrayProxy - with transforms', {
  beforeEach() {
    run(function() {
      array = ArrayProxy.extend({
        objectAtContent(idx) {
          let obj = objectAt(this.get('arrangedContent'), idx);
          return obj && obj.toString();
        }
      }).create({
        content: emberA([1, 2, 4, 5])
      });
    });
  },
  afterEach() {
    run(function() {
      array.destroy();
    });
  }
});

QUnit.test('popObject - removes last object in arrangedContent', function(assert) {
  let popped = array.popObject();
  assert.equal(popped, '5', 'returns last object');
  assert.deepEqual(array.toArray(), ['1', '2', '4'], 'removes from content');
});

QUnit.test('removeObject - removes object from content', function(assert) {
  array.removeObject('2');
  assert.deepEqual(array.toArray(), ['1', '4', '5']);
});

QUnit.test('removeObjects - removes objects from content', function(assert) {
  array.removeObjects(['2', '4', '6']);
  assert.deepEqual(array.toArray(), ['1', '5']);
});

QUnit.test('shiftObject - removes from start of arrangedContent', function(assert) {
  let shifted = array.shiftObject();
  assert.equal(shifted, '1', 'returns first object');
  assert.deepEqual(array.toArray(), ['2', '4', '5'], 'removes object from content');
});
