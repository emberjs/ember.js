import {
  defineProperty,
  hasPropertyAccessors,
  canDefineNonEnumerableProperties
} from 'ember-metal/platform/define_property';
import EnumerableUtils from 'ember-metal/enumerable_utils';

function isEnumerable(obj, keyName) {
  var keys = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key);
    }
  }
  return EnumerableUtils.indexOf(keys, keyName)>=0;
}

QUnit.module("defineProperty()");

QUnit.test("defining a simple property", function() {
  var obj = {};
  defineProperty(obj, 'foo', {
    enumerable:   true,
    writable:     true,
    value: 'FOO'
  });

  equal(obj.foo, 'FOO', 'should have added property');

  obj.foo = "BAR";
  equal(obj.foo, 'BAR', 'writable defined property should be writable');
  equal(isEnumerable(obj, 'foo'), true, 'foo should be enumerable');
});

QUnit.test('defining a read only property', function() {
  var obj = {};
  defineProperty(obj, 'foo', {
    enumerable:   true,
    writable:     false,
    value: 'FOO'
  });

  equal(obj.foo, 'FOO', 'should have added property');

  if (hasPropertyAccessors) {
    // cannot set read-only property in strict-mode
    try {
      obj.foo = "BAR";
    } catch(e) {
      // do nothing (assertion still happens in finally)
    }finally {
      equal(obj.foo, 'FOO', 'real defined property should not be writable');
    }
  } else {
    obj.foo = "BAR";
    equal(obj.foo, 'BAR', 'simulated defineProperty should silently work');
  }
});

QUnit.test('defining a non enumerable property', function() {
  var obj = {};
  defineProperty(obj, 'foo', {
    enumerable:   false,
    writable:     true,
    value: 'FOO'
  });

  if (canDefineNonEnumerableProperties) {
    equal(isEnumerable(obj, 'foo'), false, 'real defineProperty will make property not-enumerable');
  } else {
    equal(isEnumerable(obj, 'foo'), true, 'simulated defineProperty will leave properties enumerable');
  }
});

// If accessors don't exist, behavior that relies on getters
// and setters don't do anything
if (hasPropertyAccessors) {
  QUnit.test('defining a getter/setter', function() {
    var obj = {};
    var getCnt = 0;
    var setCnt = 0;
    var v = 'FOO';

    var desc = {
      enumerable: true,
      get() {
        getCnt++;
        return v;
      },
      set(val) {
        setCnt++;
        v = val;
      }
    };

    defineProperty(obj, 'foo', desc);
    equal(obj.foo, 'FOO', 'should return getter');
    equal(getCnt, 1, 'should have invoked getter');

    obj.foo = 'BAR';
    equal(obj.foo, 'BAR', 'setter should have worked');
    equal(setCnt, 1, 'should have invoked setter');
  });

  QUnit.test('defining getter/setter along with writable', function() {
    var obj  ={};
    throws(function() {
      defineProperty(obj, 'foo', {
        enumerable: true,
        get() {},
        set() {},
        writable: true
      });
    }, Error, 'defining writable and get/set should throw exception');
  });

  QUnit.test('defining getter/setter along with value', function() {
    var obj  ={};
    throws(function() {
      defineProperty(obj, 'foo', {
        enumerable: true,
        get() {},
        set() {},
        value: 'FOO'
      });
    }, Error, 'defining value and get/set should throw exception');
  });
}
