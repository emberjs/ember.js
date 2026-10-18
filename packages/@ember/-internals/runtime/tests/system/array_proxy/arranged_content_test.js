import { run } from '@ember/runloop';
import { objectAt } from '@ember/-internals/metal';
import { computed } from '@ember/object';
import ArrayProxy from '@ember/array/proxy';
import { A as emberA } from '@ember/array';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

const { DEPRECATE_ARRAY_PROXY, DEPRECATE_EMBER_ARRAY_A } = DEPRECATIONS;
const REMOVED = DEPRECATE_ARRAY_PROXY.isRemoved || DEPRECATE_EMBER_ARRAY_A.isRemoved;
const ENABLED = DEPRECATE_ARRAY_PROXY.isEnabled || DEPRECATE_EMBER_ARRAY_A.isEnabled;
const DEPRECATION = /`ArrayProxy` is deprecated|`A` from `@ember\/array` is deprecated/;

let proxy;

moduleFor(
  'ArrayProxy - arrangedContent',
  class extends AbstractTestCase {
    beforeEach() {
      expectDeprecation(DEPRECATION, ENABLED);
      run(() => {
        proxy = class extends ArrayProxy {
          @computed('content.[]')
          get arrangedContent() {
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
          }
        }.create({
          content: emberA([1, 2, 4, 5]),
        });
      });
    }

    afterEach() {
      run(() => proxy.destroy());
    }

    [`${testUnless(REMOVED)} @test compact - returns arrangedContent without nulls and undefined`](
      assert
    ) {
      run(() => proxy.set('content', emberA([1, 3, null, 2, undefined])));

      assert.deepEqual(proxy.compact(), [3, 2, 1]);
    }

    [`${testUnless(REMOVED)} @test indexOf - returns index of object in arrangedContent`](assert) {
      assert.equal(proxy.indexOf(4), 1, 'returns arranged index');
    }

    [`${testUnless(REMOVED)} @test lastIndexOf - returns last index of object in arrangedContent`](
      assert
    ) {
      proxy.get('content').pushObject(4);
      assert.equal(proxy.lastIndexOf(4), 2, 'returns last arranged index');
    }

    [`${testUnless(REMOVED)} @test objectAt - returns object at index in arrangedContent`](assert) {
      assert.equal(objectAt(proxy, 1), 4, 'returns object at index');
    }

    // Not sure if we need a specific test for it, since it's internal
    [`${testUnless(REMOVED)} @test objectAtContent - returns object at index in arrangedContent`](
      assert
    ) {
      assert.equal(proxy.objectAtContent(1), 4, 'returns object at index');
    }

    [`${testUnless(REMOVED)} @test objectsAt - returns objects at indices in arrangedContent`](
      assert
    ) {
      assert.deepEqual(proxy.objectsAt([0, 2, 4]), [5, 2, undefined], 'returns objects at indices');
    }

    [`${testUnless(REMOVED)} @test replace - mutating an arranged ArrayProxy is not allowed`]() {
      expectAssertion(() => {
        proxy.replace(0, 0, [3]);
      }, /Mutating an arranged ArrayProxy is not allowed/);
    }

    [`${testUnless(REMOVED)} @test replaceContent - does a standard array replace on content`](
      assert
    ) {
      run(() => proxy.replaceContent(1, 2, [3]));
      assert.deepEqual(proxy.get('content'), [1, 3, 5]);
    }

    [`${testUnless(REMOVED)} @test slice - returns a slice of the arrangedContent`](assert) {
      assert.deepEqual(proxy.slice(1, 3), [4, 2], 'returns sliced arrangedContent');
    }

    [`${testUnless(REMOVED)} @test toArray - returns copy of arrangedContent`](assert) {
      assert.deepEqual(proxy.toArray(), [5, 4, 2, 1]);
    }

    [`${testUnless(REMOVED)} @test without - returns arrangedContent without object`](assert) {
      assert.deepEqual(proxy.without(2), [5, 4, 1], 'returns arranged without object');
    }

    [`${testUnless(REMOVED)} @test lastObject - returns last arranged object`](assert) {
      assert.equal(proxy.get('lastObject'), 1, 'returns last arranged object');
    }

    [`${testUnless(REMOVED)} @test firstObject - returns first arranged object`](assert) {
      assert.equal(proxy.get('firstObject'), 5, 'returns first arranged object');
    }
  }
);

moduleFor(
  'ArrayProxy - arrangedContent matching content',
  class extends AbstractTestCase {
    beforeEach() {
      expectDeprecation(DEPRECATION, ENABLED);
      run(function () {
        proxy = ArrayProxy.create({
          content: emberA([1, 2, 4, 5]),
        });
      });
    }

    afterEach() {
      run(function () {
        proxy.destroy();
      });
    }

    [`${testUnless(REMOVED)} @test insertAt - inserts object at specified index`](assert) {
      run(function () {
        proxy.insertAt(2, 3);
      });
      assert.deepEqual(proxy.get('content'), [1, 2, 3, 4, 5]);
    }

    [`${testUnless(REMOVED)} @test replace - does a standard array replace`](assert) {
      run(function () {
        proxy.replace(1, 2, [3]);
      });
      assert.deepEqual(proxy.get('content'), [1, 3, 5]);
    }

    [`${testUnless(REMOVED)} @test reverseObjects - reverses content`](assert) {
      run(function () {
        proxy.reverseObjects();
      });
      assert.deepEqual(proxy.get('content'), [5, 4, 2, 1]);
    }
  }
);

moduleFor(
  'ArrayProxy - arrangedContent with transforms',
  class extends AbstractTestCase {
    beforeEach() {
      expectDeprecation(DEPRECATION, ENABLED);
      run(function () {
        proxy = class extends ArrayProxy {
          @computed('content.[]')
          get arrangedContent() {
            let content = this.get('content');
            return (
              content &&
              emberA(
                content.slice().sort(function (a, b) {
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
          }

          objectAtContent(idx) {
            let obj = objectAt(this.get('arrangedContent'), idx);
            return obj && obj.toString();
          }
        }.create({
          content: emberA([1, 2, 4, 5]),
        });
      });
    }

    afterEach() {
      run(function () {
        proxy.destroy();
      });
    }

    [`${testUnless(REMOVED)} @test indexOf - returns index of object in arrangedContent`](assert) {
      assert.equal(proxy.indexOf('4'), 1, 'returns arranged index');
    }

    [`${testUnless(REMOVED)} @test lastIndexOf - returns last index of object in arrangedContent`](
      assert
    ) {
      proxy.get('content').pushObject(4);
      assert.equal(proxy.lastIndexOf('4'), 2, 'returns last arranged index');
    }

    [`${testUnless(REMOVED)} @test objectAt - returns object at index in arrangedContent`](assert) {
      assert.equal(objectAt(proxy, 1), '4', 'returns object at index');
    }

    // Not sure if we need a specific test for it, since it's internal
    [`${testUnless(REMOVED)} @test objectAtContent - returns object at index in arrangedContent`](
      assert
    ) {
      assert.equal(proxy.objectAtContent(1), '4', 'returns object at index');
    }

    [`${testUnless(REMOVED)} @test objectsAt - returns objects at indices in arrangedContent`](
      assert
    ) {
      assert.deepEqual(
        proxy.objectsAt([0, 2, 4]),
        ['5', '2', undefined],
        'returns objects at indices'
      );
    }

    [`${testUnless(REMOVED)} @test slice - returns a slice of the arrangedContent`](assert) {
      assert.deepEqual(proxy.slice(1, 3), ['4', '2'], 'returns sliced arrangedContent');
    }

    [`${testUnless(REMOVED)} @test toArray - returns copy of arrangedContent`](assert) {
      assert.deepEqual(proxy.toArray(), ['5', '4', '2', '1']);
    }

    [`${testUnless(REMOVED)} @test without - returns arrangedContent without object`](assert) {
      assert.deepEqual(proxy.without('2'), ['5', '4', '1'], 'returns arranged without object');
    }

    [`${testUnless(REMOVED)} @test lastObject - returns last arranged object`](assert) {
      assert.equal(proxy.get('lastObject'), '1', 'returns last arranged object');
    }

    [`${testUnless(REMOVED)} @test firstObject - returns first arranged object`](assert) {
      assert.equal(proxy.get('firstObject'), '5', 'returns first arranged object');
    }
  }
);

moduleFor(
  'ArrayProxy - with transforms',
  class extends AbstractTestCase {
    beforeEach() {
      expectDeprecation(DEPRECATION, ENABLED);
      run(function () {
        proxy = class extends ArrayProxy {
          objectAtContent(idx) {
            let obj = objectAt(this.get('arrangedContent'), idx);
            return obj && obj.toString();
          }
        }.create({
          content: emberA([1, 2, 4, 5]),
        });
      });
    }

    afterEach() {
      run(function () {
        proxy.destroy();
      });
    }

    [`${testUnless(REMOVED)} @test popObject - removes last object in arrangedContent`](assert) {
      let popped = proxy.popObject();
      assert.equal(popped, '5', 'returns last object');
      assert.deepEqual(proxy.toArray(), ['1', '2', '4'], 'removes from content');
    }

    [`${testUnless(REMOVED)} @test removeObject - removes object from content`](assert) {
      proxy.removeObject('2');
      assert.deepEqual(proxy.toArray(), ['1', '4', '5']);
    }

    [`${testUnless(REMOVED)} @test removeObjects - removes objects from content`](assert) {
      proxy.removeObjects(['2', '4', '6']);
      assert.deepEqual(proxy.toArray(), ['1', '5']);
    }

    [`${testUnless(REMOVED)} @test shiftObject - removes from start of arrangedContent`](assert) {
      let shifted = proxy.shiftObject();
      assert.equal(shifted, '1', 'returns first object');
      assert.deepEqual(proxy.toArray(), ['2', '4', '5'], 'removes object from content');
    }
  }
);
