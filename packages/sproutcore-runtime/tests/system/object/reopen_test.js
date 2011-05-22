// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/core_object/reopenClass');

test('adds new properties to subclass instance', function() {
  
  var Subclass = SC.Object.extend();
  Subclass.reopen({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });
  
  equals( new Subclass().foo(), 'FOO', 'Adds method');
  equals(SC.get(new Subclass(), 'bar'), 'BAR', 'Adds property');
});

test('reopened properties inherited by subclasses', function() {
  
  var Subclass = SC.Object.extend();
  var SubSub = Subclass.extend();

  Subclass.reopen({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });

  
  equals( new SubSub().foo(), 'FOO', 'Adds method');
  equals(SC.get(new SubSub(), 'bar'), 'BAR', 'Adds property');
});

