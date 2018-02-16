import { MANDATORY_SETTER } from 'ember/features';
import {
  get,
  set,
  watch,
  unwatch,
  meta as metaFor
} from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function hasMandatorySetter(object, property) {
  try {
    return Object.getOwnPropertyDescriptor(object, property).set.isMandatorySetter === true;
  } catch (e) {
    return false;
  }
}

function hasMetaValue(object, property) {
  return metaFor(object).peekValues(property) !== undefined;
}

if (MANDATORY_SETTER) {
  moduleFor('mandory-setters', class extends AbstractTestCase {
    ['@test does not assert if property is not being watched'](assert) {
      let obj = {
        someProp: null,
        toString() {
          return 'custom-object';
        }
      };

      obj.someProp = 'blastix';
      assert.equal(get(obj, 'someProp'), 'blastix');
    }

    ['@test should not setup mandatory-setter if property is not writable'](assert) {
      assert.expect(6);

      let obj = { };

      Object.defineProperty(obj, 'a', { value: true });
      Object.defineProperty(obj, 'b', { value: false });
      Object.defineProperty(obj, 'c', { value: undefined });
      Object.defineProperty(obj, 'd', { value: undefined, writable: false });
      Object.defineProperty(obj, 'e', { value: undefined, configurable: false });
      Object.defineProperty(obj, 'f', { value: undefined, configurable: true });

      watch(obj, 'a');
      watch(obj, 'b');
      watch(obj, 'c');
      watch(obj, 'd');
      watch(obj, 'e');
      watch(obj, 'f');

      assert.ok(!hasMandatorySetter(obj, 'a'), 'mandatory-setter should not be installed');
      assert.ok(!hasMandatorySetter(obj, 'b'), 'mandatory-setter should not be installed');
      assert.ok(!hasMandatorySetter(obj, 'c'), 'mandatory-setter should not be installed');
      assert.ok(!hasMandatorySetter(obj, 'd'), 'mandatory-setter should not be installed');
      assert.ok(!hasMandatorySetter(obj, 'e'), 'mandatory-setter should not be installed');
      assert.ok(!hasMandatorySetter(obj, 'f'), 'mandatory-setter should not be installed');
    }

    ['@test should not teardown non mandatory-setter descriptor'](assert) {
      assert.expect(1);

      let obj = { get a() { return 'hi'; } };

      watch(obj, 'a');
      unwatch(obj, 'a');

      assert.equal(obj.a, 'hi');
    }

    ['@test should not confuse non descriptor watched gets'](assert) {
      assert.expect(2);

      let obj = { get a() { return 'hi'; } };

      watch(obj, 'a');
      assert.equal(get(obj, 'a'), 'hi');
      assert.equal(obj.a, 'hi');
    }

    ['@test should not setup mandatory-setter if setter is already setup on property'](assert) {
      assert.expect(2);

      let obj = { someProp: null };

      Object.defineProperty(obj, 'someProp', {
        get() {
          return null;
        },

        set(value) {
          assert.equal(value, 'foo-bar', 'custom setter was called');
        }
      });

      watch(obj, 'someProp');
      assert.ok(!hasMandatorySetter(obj, 'someProp'), 'mandatory-setter should not be installed');

      obj.someProp = 'foo-bar';
    }

    ['@test watched ES5 setter should not be smashed by mandatory setter'](assert) {
      let value;
      let obj = {
        get foo() { },
        set foo(_value) {
          value = _value;
        }
      };

      watch(obj, 'foo');

      set(obj, 'foo', 2);
      assert.equal(value, 2);
    }

    ['@test should not setup mandatory-setter if setter is already setup on property in parent prototype'](assert) {
      assert.expect(2);

      function Foo() { }

      Object.defineProperty(Foo.prototype, 'someProp', {
        get() {
          return null;
        },

        set(value) {
          assert.equal(value, 'foo-bar', 'custom setter was called');
        }
      });

      let obj = new Foo();

      watch(obj, 'someProp');
      assert.ok(!hasMandatorySetter(obj, 'someProp'), 'mandatory-setter should not be installed');

      obj.someProp = 'foo-bar';
    }

    ['@test should not setup mandatory-setter if setter is already setup on property in grandparent prototype'](assert) {
      assert.expect(2);

      function Foo() { }

      Object.defineProperty(Foo.prototype, 'someProp', {
        get() {
          return null;
        },

        set(value) {
          assert.equal(value, 'foo-bar', 'custom setter was called');
        }
      });

      function Bar() { }
      Bar.prototype = Object.create(Foo.prototype);
      Bar.prototype.constructor = Bar;

      let obj = new Bar();

      watch(obj, 'someProp');
      assert.ok(!hasMandatorySetter(obj, 'someProp'), 'mandatory-setter should not be installed');

      obj.someProp = 'foo-bar';
    }

    ['@test should not setup mandatory-setter if setter is already setup on property in great grandparent prototype'](assert) {
      assert.expect(2);

      function Foo() { }

      Object.defineProperty(Foo.prototype, 'someProp', {
        get() {
          return null;
        },

        set(value) {
          assert.equal(value, 'foo-bar', 'custom setter was called');
        }
      });

      function Bar() { }
      Bar.prototype = Object.create(Foo.prototype);
      Bar.prototype.constructor = Bar;

      function Qux() { }
      Qux.prototype = Object.create(Bar.prototype);
      Qux.prototype.constructor = Qux;

      let obj = new Qux();

      watch(obj, 'someProp');
      assert.ok(!hasMandatorySetter(obj, 'someProp'), 'mandatory-setter should not be installed');

      obj.someProp = 'foo-bar';
    }

    ['@test should assert if set without set when property is being watched']() {
      let obj = {
        someProp: null,
        toString() {
          return 'custom-object';
        }
      };

      watch(obj, 'someProp');

      expectAssertion(function() {
        obj.someProp = 'foo-bar';
      }, 'You must use set() to set the `someProp` property (of custom-object) to `foo-bar`.');
    }

    ['@test should not assert if set with set when property is being watched'](assert) {
      let obj = {
        someProp: null,
        toString() {
          return 'custom-object';
        }
      };

      watch(obj, 'someProp');
      set(obj, 'someProp', 'foo-bar');

      assert.equal(get(obj, 'someProp'), 'foo-bar');
    }

    ['@test does not setup mandatory-setter if non-configurable'](assert) {
      let obj = {
        someProp: null,
        toString() {
          return 'custom-object';
        }
      };

      Object.defineProperty(obj, 'someProp', {
        configurable: false,
        enumerable: true,
        value: 'blastix'
      });

      watch(obj, 'someProp');
      assert.ok(!(hasMandatorySetter(obj, 'someProp')), 'blastix');
    }

    ['@test ensure after watch the property is restored (and the value is no-longer stored in meta) [non-enumerable]'](assert) {
      let obj = {
        someProp: null,
        toString() {
          return 'custom-object';
        }
      };

      Object.defineProperty(obj, 'someProp', {
        configurable: true,
        enumerable: false,
        value: 'blastix'
      });

      watch(obj, 'someProp');
      assert.equal(hasMandatorySetter(obj, 'someProp'), true, 'should have a mandatory setter');

      let descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

      assert.equal(descriptor.enumerable, false, 'property should remain non-enumerable');
      assert.equal(descriptor.configurable, true, 'property should remain configurable');
      assert.equal(obj.someProp, 'blastix', 'expected value to be the getter');

      assert.equal(descriptor.value, undefined, 'expected existing value to NOT remain');

      assert.ok(hasMetaValue(obj, 'someProp'), 'someProp is stored in meta.values');

      unwatch(obj, 'someProp');

      assert.ok(!hasMetaValue(obj, 'someProp'), 'someProp is no longer stored in meta.values');

      descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

      assert.equal(hasMandatorySetter(obj, 'someProp'), false, 'should no longer have a mandatory setter');

      assert.equal(descriptor.enumerable, false, 'property should remain non-enumerable');
      assert.equal(descriptor.configurable, true, 'property should remain configurable');
      assert.equal(obj.someProp, 'blastix', 'expected value to be the getter');
      assert.equal(descriptor.value, 'blastix', 'expected existing value to remain');

      obj.someProp = 'new value';

      // make sure the descriptor remains correct (nothing funky, like a redefined, happened in the setter);
      descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

      assert.equal(descriptor.enumerable, false, 'property should remain non-enumerable');
      assert.equal(descriptor.configurable, true, 'property should remain configurable');
      assert.equal(descriptor.value, 'new value', 'expected existing value to NOT remain');
      assert.equal(obj.someProp, 'new value', 'expected value to be the getter');
      assert.equal(obj.someProp, 'new value');
    }

    ['@test ensure after watch the property is restored (and the value is no-longer stored in meta) [enumerable]'](assert) {
      let obj = {
        someProp: null,
        toString() {
          return 'custom-object';
        }
      };

      Object.defineProperty(obj, 'someProp', {
        configurable: true,
        enumerable: true,
        value: 'blastix'
      });

      watch(obj, 'someProp');
      assert.equal(hasMandatorySetter(obj, 'someProp'), true, 'should have a mandatory setter');

      let descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

      assert.equal(descriptor.enumerable, true, 'property should remain enumerable');
      assert.equal(descriptor.configurable, true, 'property should remain configurable');
      assert.equal(obj.someProp, 'blastix', 'expected value to be the getter');

      assert.equal(descriptor.value, undefined, 'expected existing value to NOT remain');

      assert.ok(hasMetaValue(obj, 'someProp'), 'someProp is stored in meta.values');

      unwatch(obj, 'someProp');

      assert.ok(!hasMetaValue(obj, 'someProp'), 'someProp is no longer stored in meta.values');

      descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

      assert.equal(hasMandatorySetter(obj, 'someProp'), false, 'should no longer have a mandatory setter');

      assert.equal(descriptor.enumerable, true, 'property should remain enumerable');
      assert.equal(descriptor.configurable, true, 'property should remain configurable');
      assert.equal(obj.someProp, 'blastix', 'expected value to be the getter');
      assert.equal(descriptor.value, 'blastix', 'expected existing value to remain');

      obj.someProp = 'new value';

      // make sure the descriptor remains correct (nothing funky, like a redefined, happened in the setter);
      descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

      assert.equal(descriptor.enumerable, true, 'property should remain enumerable');
      assert.equal(descriptor.configurable, true, 'property should remain configurable');
      assert.equal(descriptor.value, 'new value', 'expected existing value to NOT remain');
      assert.equal(obj.someProp, 'new value');
    }

    ['@test sets up mandatory-setter if property comes from prototype'](assert) {
      assert.expect(2);

      let obj = {
        someProp: null,
        toString() {
          return 'custom-object';
        }
      };

      let obj2 = Object.create(obj);

      watch(obj2, 'someProp');

      assert.ok(hasMandatorySetter(obj2, 'someProp'), 'mandatory setter has been setup');

      expectAssertion(function() {
        obj2.someProp = 'foo-bar';
      }, 'You must use set() to set the `someProp` property (of custom-object) to `foo-bar`.');
    }

    ['@test inheritance remains live'](assert) {
      function Parent() {}
      Parent.prototype.food  = 'chips';

      let child = new Parent();

      assert.equal(child.food, 'chips');

      watch(child, 'food');

      assert.equal(child.food, 'chips');

      Parent.prototype.food  = 'icecreame';

      assert.equal(child.food, 'icecreame');

      unwatch(child, 'food');

      assert.equal(child.food, 'icecreame');

      Parent.prototype.food  = 'chips';

      assert.equal(child.food, 'chips');
    }

    ['@test inheritance remains live and preserves this'](assert) {
      function Parent(food) {
        this._food = food;
      }

      Object.defineProperty(Parent.prototype, 'food', {
        get() {
          return this._food;
        }
      });

      let child = new Parent('chips');

      assert.equal(child.food, 'chips');

      watch(child, 'food');

      assert.equal(child.food, 'chips');

      child._food = 'icecreame';

      assert.equal(child.food, 'icecreame');

      unwatch(child, 'food');

      assert.equal(child.food, 'icecreame');

      let foodDesc = Object.getOwnPropertyDescriptor(Parent.prototype, 'food');
      assert.ok(!foodDesc.configurable, 'Parent.prototype.food desc should be non configable');
      assert.ok(!foodDesc.enumerable, 'Parent.prototype.food desc should be non enumerable');

      assert.equal(foodDesc.get.call({
        _food: 'hi'
      }), 'hi');
      assert.equal(foodDesc.set, undefined);

      assert.equal(child.food, 'icecreame');
    }
  });
}
