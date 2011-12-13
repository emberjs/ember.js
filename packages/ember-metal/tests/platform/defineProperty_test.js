// ==========================================================================
// Project:  Ember Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal');

function isEnumerable(obj, keyName) {
  var keys = [];
  for(var key in obj) {
    if (obj.hasOwnProperty(key)) keys.push(key);
  }
  return keys.indexOf(keyName)>=0;
}

module("Ember.platform.defineProperty()");

test("defining a simple property", function() {
  var obj = {};
  Ember.platform.defineProperty(obj, 'foo', {
    enumerable:   true,
    writable:     true,
    value: 'FOO'
  });
  
  equals(obj.foo, 'FOO', 'should have added property');
  
  obj.foo = "BAR";
  equals(obj.foo, 'BAR', 'writable defined property should be writable');
  equals(isEnumerable(obj, 'foo'), true, 'foo should be enumerable');
});

test('defining a read only property', function() {
  var obj = {};
  Ember.platform.defineProperty(obj, 'foo', {
    enumerable:   true,
    writable:     false,
    value: 'FOO'
  });
  
  equals(obj.foo, 'FOO', 'should have added property');
  
  obj.foo = "BAR";
  if (Ember.platform.defineProperty.isSimulated) {
    equals(obj.foo, 'BAR', 'simulated defineProperty should silently work');
  } else {
    equals(obj.foo, 'FOO', 'real defined property should not be writable');
  }
  
});

test('defining a non enumerable property', function() {
  var obj = {};
  Ember.platform.defineProperty(obj, 'foo', {
    enumerable:   false,
    writable:     true,
    value: 'FOO'
  });
  
  if (Ember.platform.defineProperty.isSimulated) {
    equals(isEnumerable(obj, 'foo'), true, 'simulated defineProperty will leave properties enumerable');
  } else {
    equals(isEnumerable(obj, 'foo'), false, 'real defineProperty will make property not-enumerable');
  }
});

test('defining a getter/setter', function() {
  var obj = {}, getCnt = 0, setCnt = 0, v = 'FOO';

  var desc = {
    enumerable: true,
    get: function() { getCnt++; return v; },
    set: function(val) { setCnt++; v = val; }
  };
  
  if (Ember.platform.hasPropertyAccessors) {
    Ember.platform.defineProperty(obj, 'foo', desc);
    equals(obj.foo, 'FOO', 'should return getter');
    equals(getCnt, 1, 'should have invoked getter');
    
    obj.foo = 'BAR';
    equals(obj.foo, 'BAR', 'setter should have worked');
    equals(setCnt, 1, 'should have invoked setter');

  } else {
    raises(function() {
      Ember.platform.defineProperty(obj, 'foo', desc);
    }, Error, 'should throw exception if getters/setters not supported');
  }
  
});

test('defining getter/setter along with writable', function() {
  var obj  ={};
  raises(function() {
    Ember.platform.defineProperty(obj, 'foo', {
      enumerable: true,
      get: function() {},
      set: function() {},
      writable: true
    });
  }, Error, 'defining writable and get/set should throw exception');
});

test('defining getter/setter along with value', function() {
  var obj  ={};
  raises(function() {
    Ember.platform.defineProperty(obj, 'foo', {
      enumerable: true,
      get: function() {},
      set: function() {},
      value: 'FOO'
    });
  }, Error, 'defining value and get/set should throw exception');
});
