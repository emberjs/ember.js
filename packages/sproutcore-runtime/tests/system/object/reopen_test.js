// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/core_object/reopenClass');

test('adds new properties to subclass instance', function() {
  
  var Subclass = Ember.Object.extend();
  Subclass.reopen({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });
  
  equals( new Subclass().foo(), 'FOO', 'Adds method');
  equals(Ember.get(new Subclass(), 'bar'), 'BAR', 'Adds property');
});

test('reopened properties inherited by subclasses', function() {
  
  var Subclass = Ember.Object.extend();
  var SubSub = Subclass.extend();

  Subclass.reopen({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });

  
  equals( new SubSub().foo(), 'FOO', 'Adds method');
  equals(Ember.get(new SubSub(), 'bar'), 'BAR', 'Adds property');
});

