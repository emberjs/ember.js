import { get, set } from 'ember-metal';
import EmberObject from '../../../../system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Changed get(obj, ) and set(obj, ) to Ember.get() and Ember.set()
  * Removed obj.instanceOf() and obj.kindOf() tests.  use obj instanceof Foo
    instead
  * Removed respondsTo() and tryToPerform() tests.  Can be brought back in a
    utils package.
  * Removed destroy() test.  You can impl yourself but not built in
  * Changed Class.subclassOf() test to Class.detect()
  * Remove broken test for 'superclass' property.
  * Removed obj.didChangeFor()
*/

// ========================================================================
// EmberObject Base Tests
// ========================================================================

let obj, obj1; // global variables

moduleFor(
  'A new EmberObject instance',
  class extends AbstractTestCase {
    beforeEach() {
      obj = EmberObject.create({
        foo: 'bar',
        total: 12345,
        aMethodThatExists() {},
        aMethodThatReturnsTrue() {
          return true;
        },
        aMethodThatReturnsFoobar() {
          return 'Foobar';
        },
        aMethodThatReturnsFalse() {
          return false;
        },
      });
    }

    afterEach() {
      obj = undefined;
    }

    ['@test Should return its properties when requested using EmberObject#get'](assert) {
      assert.equal(get(obj, 'foo'), 'bar');
      assert.equal(get(obj, 'total'), 12345);
    }

    ['@test Should allow changing of those properties by calling EmberObject#set'](assert) {
      assert.equal(get(obj, 'foo'), 'bar');
      assert.equal(get(obj, 'total'), 12345);

      set(obj, 'foo', 'Chunky Bacon');
      set(obj, 'total', 12);

      assert.equal(get(obj, 'foo'), 'Chunky Bacon');
      assert.equal(get(obj, 'total'), 12);
    }
  }
);

moduleFor(
  'EmberObject superclass and subclasses',
  class extends AbstractTestCase {
    beforeEach() {
      obj = EmberObject.extend({
        method1() {
          return 'hello';
        },
      });
      obj1 = obj.extend();
    }

    afterEach() {
      obj = undefined;
      obj1 = undefined;
    }

    ['@test Checking the detect() function on an object and its subclass'](assert) {
      assert.equal(obj.detect(obj1), true);
      assert.equal(obj1.detect(obj), false);
    }

    ['@test Checking the detectInstance() function on an object and its subclass'](assert) {
      assert.ok(EmberObject.detectInstance(obj.create()));
      assert.ok(obj.detectInstance(obj.create()));
    }
  }
);
