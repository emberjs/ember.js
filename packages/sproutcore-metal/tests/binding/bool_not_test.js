// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp */

function testBool(val, expected) {
  test('Forces '+Object.prototype.toString.call(val)+' value to '+expected, function() {
    Ember.set(MyApp.foo, 'value', val);
    Ember.run.sync();
    equals(Ember.get(MyApp.bar, 'value'), expected);
  });
}

module('system/binding/bool', {
  setup: function() {
    MyApp = {
      foo: { value: 'FOO' },
      bar: { value: 'BAR' }
    };
    
    Ember.bind(MyApp, 'bar.value', 'foo.value').bool();
  },

  teardown: function() {
    MyApp = null;
  }
});

testBool(true, true);
testBool('STRING', true);
testBool(23, true);
testBool({ object: 123 }, true);
testBool([1,2,3], true);
testBool([], true);

testBool(false, false);
testBool(null, false);
testBool(undefined, false);
testBool(0, false);
testBool('', false);


module('system/binding/not', {
  setup: function() {
    MyApp = {
      foo: { value: 'FOO' },
      bar: { value: 'BAR' }
    };
    
    Ember.bind(MyApp, 'bar.value', 'foo.value').not();
  },

  teardown: function() {
    MyApp = null;
  }
});

testBool(true, false);
testBool('STRING', false);
testBool(23, false);
testBool({ object: 123 }, false);
testBool([1,2,3], false);
testBool([], false);

testBool(false, true);
testBool(null, true);
testBool(undefined, true);
testBool(0, true);
testBool('', true);


