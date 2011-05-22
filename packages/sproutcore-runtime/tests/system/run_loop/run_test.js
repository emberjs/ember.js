// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/run_loop/run_test');

test('SC.run invokes passed function, returning value', function() {
  var obj = { 
    foo: function() { return [this.bar, 'FOO']; }, 
    bar: 'BAR' 
  };

  equals(SC.run(function() { return 'FOO'; }), 'FOO', 'pass function only');
  same(SC.run(obj, obj.foo), ['BAR', 'FOO'], 'pass obj.method');
  same(SC.run(obj, 'foo'), ['BAR', 'FOO'], 'pass obj.method');
});