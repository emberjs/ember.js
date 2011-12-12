// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/object/reopenClass');

test('adds new properties to subclass', function() {
  
  var Subclass = Ember.Object.extend();
  Subclass.reopenClass({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });
  
  equals(Subclass.foo(), 'FOO', 'Adds method');
  equals(Ember.get(Subclass, 'bar'), 'BAR', 'Adds property');
});

test('class properties inherited by subclasses', function() {
  
  var Subclass = Ember.Object.extend();
  Subclass.reopenClass({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });

  var SubSub = Subclass.extend();
  
  equals(SubSub.foo(), 'FOO', 'Adds method');
  equals(Ember.get(SubSub, 'bar'), 'BAR', 'Adds property');
});

