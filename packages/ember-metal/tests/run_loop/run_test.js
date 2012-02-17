// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/run_loop/run_test');

test('Ember.run invokes passed function, returning value', function() {
  var obj = {
    foo: function() { return [this.bar, 'FOO']; },
    bar: 'BAR',
    checkArgs: function(arg1, arg2) { return [ arg1, this.bar, arg2 ]; }
  };

  equal(Ember.run(function() { return 'FOO'; }), 'FOO', 'pass function only');
  deepEqual(Ember.run(obj, obj.foo), ['BAR', 'FOO'], 'pass obj and obj.method');
  deepEqual(Ember.run(obj, 'foo'), ['BAR', 'FOO'], 'pass obj and "method"');
  deepEqual(Ember.run(obj, obj.checkArgs, 'hello', 'world'), ['hello', 'BAR', 'world'], 'pass obj, obj.method, and extra arguments');
});
