// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth */

require('ember-metal/~tests/props_helper');

module('Ember.Mixin observer');

testBoth('global observer helper', function(get, set) {

  var MyMixin = Ember.Mixin.create({
    
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var obj = Ember.mixin({}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('global observer helper takes multiple params', function(get, set) {

  var MyMixin = Ember.Mixin.create({
    
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar', 'baz')

  });

  var obj = Ember.mixin({}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  set(obj, 'baz', "BAZ");
  equals(get(obj, 'count'), 2, 'should invoke observer after change');
});


testBoth('replacing observer should remove old observer', function(get, set) {

  var MyMixin = Ember.Mixin.create({
    
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var Mixin2 = Ember.Mixin.create({
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+10);
    }, 'baz')
  });
  
  var obj = Ember.mixin({}, MyMixin, Mixin2);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equals(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', "BAZ");
  equals(get(obj, 'count'), 10, 'should invoke observer after change');

});
