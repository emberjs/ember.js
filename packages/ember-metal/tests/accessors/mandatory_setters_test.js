import { isFeatureEnabled } from 'ember-debug';
import {
  get,
  set,
  watch,
  unwatch,
  meta as metaFor
} from '../..';

QUnit.module('mandatory-setters');

function hasMandatorySetter(object, property) {
  try {
    return Object.getOwnPropertyDescriptor(object, property).set.isMandatorySetter === true;
  } catch (e) {
    return false;
  }
}

function hasMetaValue(object, property) {
  return metaFor(object).hasInValues(property);
}

if (isFeatureEnabled('mandatory-setter')) {
  QUnit.test('does not assert if property is not being watched', function() {
    let obj = {
      someProp: null,
      toString() {
        return 'custom-object';
      }
    };

    obj.someProp = 'blastix';
    equal(get(obj, 'someProp'), 'blastix');
  });

  QUnit.test('should not setup mandatory-setter if property is not writable', function() {
    expect(6);

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

    ok(!hasMandatorySetter(obj, 'a'), 'mandatory-setter should not be installed');
    ok(!hasMandatorySetter(obj, 'b'), 'mandatory-setter should not be installed');
    ok(!hasMandatorySetter(obj, 'c'), 'mandatory-setter should not be installed');
    ok(!hasMandatorySetter(obj, 'd'), 'mandatory-setter should not be installed');
    ok(!hasMandatorySetter(obj, 'e'), 'mandatory-setter should not be installed');
    ok(!hasMandatorySetter(obj, 'f'), 'mandatory-setter should not be installed');
  });

  QUnit.test('should not teardown non mandatory-setter descriptor', function() {
    expect(1);

    let obj = { get a() { return 'hi'; } };

    watch(obj, 'a');
    unwatch(obj, 'a');

    equal(obj.a, 'hi');
  });

  QUnit.test('should not confuse non descriptor watched gets', function() {
    expect(2);

    let obj = { get a() { return 'hi'; } };

    watch(obj, 'a');
    equal(get(obj, 'a'), 'hi');
    equal(obj.a, 'hi');
  });

  QUnit.test('should not setup mandatory-setter if setter is already setup on property', function() {
    expect(2);

    let obj = { someProp: null };

    Object.defineProperty(obj, 'someProp', {
      get() {
        return null;
      },

      set(value) {
        equal(value, 'foo-bar', 'custom setter was called');
      }
    });

    watch(obj, 'someProp');
    ok(!hasMandatorySetter(obj, 'someProp'), 'mandatory-setter should not be installed');

    obj.someProp = 'foo-bar';
  });

  QUnit.test('watched ES5 setter should not be smashed by mandatory setter', function() {
    let value;
    let obj = {
      get foo() { },
      set foo(_value) {
        value = _value;
      }
    };

    watch(obj, 'foo');

    set(obj, 'foo', 2);
    equal(value, 2);
  });

  QUnit.test('should not setup mandatory-setter if setter is already setup on property in parent prototype', function() {
    expect(2);

    function Foo() { }

    Object.defineProperty(Foo.prototype, 'someProp', {
      get() {
        return null;
      },

      set(value) {
        equal(value, 'foo-bar', 'custom setter was called');
      }
    });

    let obj = new Foo();

    watch(obj, 'someProp');
    ok(!hasMandatorySetter(obj, 'someProp'), 'mandatory-setter should not be installed');

    obj.someProp = 'foo-bar';
  });

  QUnit.test('should not setup mandatory-setter if setter is already setup on property in grandparent prototype', function() {
    expect(2);

    function Foo() { }

    Object.defineProperty(Foo.prototype, 'someProp', {
      get() {
        return null;
      },

      set(value) {
        equal(value, 'foo-bar', 'custom setter was called');
      }
    });

    function Bar() { }
    Bar.prototype = Object.create(Foo.prototype);
    Bar.prototype.constructor = Bar;

    let obj = new Bar();

    watch(obj, 'someProp');
    ok(!hasMandatorySetter(obj, 'someProp'), 'mandatory-setter should not be installed');

    obj.someProp = 'foo-bar';
  });

  QUnit.test('should not setup mandatory-setter if setter is already setup on property in great grandparent prototype', function() {
    expect(2);

    function Foo() { }

    Object.defineProperty(Foo.prototype, 'someProp', {
      get() {
        return null;
      },

      set(value) {
        equal(value, 'foo-bar', 'custom setter was called');
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
    ok(!hasMandatorySetter(obj, 'someProp'), 'mandatory-setter should not be installed');

    obj.someProp = 'foo-bar';
  });

  QUnit.test('should assert if set without Ember.set when property is being watched', function() {
    let obj = {
      someProp: null,
      toString() {
        return 'custom-object';
      }
    };

    watch(obj, 'someProp');

    expectAssertion(function() {
      obj.someProp = 'foo-bar';
    }, 'You must use Ember.set() to set the `someProp` property (of custom-object) to `foo-bar`.');
  });

  QUnit.test('should not assert if set with Ember.set when property is being watched', function() {
    let obj = {
      someProp: null,
      toString() {
        return 'custom-object';
      }
    };

    watch(obj, 'someProp');
    set(obj, 'someProp', 'foo-bar');

    equal(get(obj, 'someProp'), 'foo-bar');
  });

  QUnit.test('does not setup mandatory-setter if non-configurable', function() {
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
    ok(!(hasMandatorySetter(obj, 'someProp')), 'blastix');
  });

  QUnit.test('ensure after watch the property is restored (and the value is no-longer stored in meta) [non-enumerable]', function() {
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
    equal(hasMandatorySetter(obj, 'someProp'), true, 'should have a mandatory setter');

    let descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

    equal(descriptor.enumerable, false, 'property should remain non-enumerable');
    equal(descriptor.configurable, true, 'property should remain configurable');
    equal(obj.someProp, 'blastix', 'expected value to be the getter');

    equal(descriptor.value, undefined, 'expected existing value to NOT remain');

    ok(hasMetaValue(obj, 'someProp'), 'someProp is stored in meta.values');

    unwatch(obj, 'someProp');

    ok(!hasMetaValue(obj, 'someProp'), 'someProp is no longer stored in meta.values');

    descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

    equal(hasMandatorySetter(obj, 'someProp'), false, 'should no longer have a mandatory setter');

    equal(descriptor.enumerable, false, 'property should remain non-enumerable');
    equal(descriptor.configurable, true, 'property should remain configurable');
    equal(obj.someProp, 'blastix', 'expected value to be the getter');
    equal(descriptor.value, 'blastix', 'expected existing value to remain');

    obj.someProp = 'new value';

    // make sure the descriptor remains correct (nothing funky, like a redefined, happened in the setter);
    descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

    equal(descriptor.enumerable, false, 'property should remain non-enumerable');
    equal(descriptor.configurable, true, 'property should remain configurable');
    equal(descriptor.value, 'new value', 'expected existing value to NOT remain');
    equal(obj.someProp, 'new value', 'expected value to be the getter');
    equal(obj.someProp, 'new value');
  });

  QUnit.test('ensure after watch the property is restored (and the value is no-longer stored in meta) [enumerable]', function() {
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
    equal(hasMandatorySetter(obj, 'someProp'), true, 'should have a mandatory setter');

    let descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

    equal(descriptor.enumerable, true, 'property should remain enumerable');
    equal(descriptor.configurable, true, 'property should remain configurable');
    equal(obj.someProp, 'blastix', 'expected value to be the getter');

    equal(descriptor.value, undefined, 'expected existing value to NOT remain');

    ok(hasMetaValue(obj, 'someProp'), 'someProp is stored in meta.values');

    unwatch(obj, 'someProp');

    ok(!hasMetaValue(obj, 'someProp'), 'someProp is no longer stored in meta.values');

    descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

    equal(hasMandatorySetter(obj, 'someProp'), false, 'should no longer have a mandatory setter');

    equal(descriptor.enumerable, true, 'property should remain enumerable');
    equal(descriptor.configurable, true, 'property should remain configurable');
    equal(obj.someProp, 'blastix', 'expected value to be the getter');
    equal(descriptor.value, 'blastix', 'expected existing value to remain');

    obj.someProp = 'new value';

    // make sure the descriptor remains correct (nothing funky, like a redefined, happened in the setter);
    descriptor = Object.getOwnPropertyDescriptor(obj, 'someProp');

    equal(descriptor.enumerable, true, 'property should remain enumerable');
    equal(descriptor.configurable, true, 'property should remain configurable');
    equal(descriptor.value, 'new value', 'expected existing value to NOT remain');
    equal(obj.someProp, 'new value');
  });

  QUnit.test('sets up mandatory-setter if property comes from prototype', function() {
    expect(2);

    let obj = {
      someProp: null,
      toString() {
        return 'custom-object';
      }
    };

    let obj2 = Object.create(obj);

    watch(obj2, 'someProp');

    ok(hasMandatorySetter(obj2, 'someProp'), 'mandatory setter has been setup');

    expectAssertion(function() {
      obj2.someProp = 'foo-bar';
    }, 'You must use Ember.set() to set the `someProp` property (of custom-object) to `foo-bar`.');
  });

  QUnit.test('inheritance remains live', function() {
    function Parent() {}
    Parent.prototype.food  = 'chips';

    let child = new Parent();

    equal(child.food, 'chips');

    watch(child, 'food');

    equal(child.food, 'chips');

    Parent.prototype.food  = 'icecreame';

    equal(child.food, 'icecreame');

    unwatch(child, 'food');

    equal(child.food, 'icecreame');

    Parent.prototype.food  = 'chips';

    equal(child.food, 'chips');
  });


  QUnit.test('inheritance remains live and preserves this', function() {
    function Parent(food) {
      this._food = food;
    }

    Object.defineProperty(Parent.prototype, 'food', {
      get() {
        return this._food;
      }
    });

    let child = new Parent('chips');

    equal(child.food, 'chips');

    watch(child, 'food');

    equal(child.food, 'chips');

    child._food = 'icecreame';

    equal(child.food, 'icecreame');

    unwatch(child, 'food');

    equal(child.food, 'icecreame');

    let foodDesc = Object.getOwnPropertyDescriptor(Parent.prototype, 'food');
    ok(!foodDesc.configurable, 'Parent.prototype.food desc should be non configable');
    ok(!foodDesc.enumerable, 'Parent.prototype.food desc should be non enumerable');

    equal(foodDesc.get.call({
      _food: 'hi'
    }), 'hi');
    equal(foodDesc.set, undefined);

    equal(child.food, 'icecreame');
  });
}
