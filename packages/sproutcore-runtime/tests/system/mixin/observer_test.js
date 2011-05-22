// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth */

require('sproutcore-metal/~tests/props_helper');

module('SC.Mixin observer');

testBoth('global observer helper', function(get, set) {

  var MyMixin = SC.Mixin.create({
    
    count: 0,
    
    foo: SC.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var obj = SC.Mixin.apply({}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('global observer helper takes multiple params', function(get, set) {

  var MyMixin = SC.Mixin.create({
    
    count: 0,
    
    foo: SC.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar', 'baz')

  });

  var obj = SC.Mixin.apply({}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  set(obj, 'baz', "BAZ");
  equals(get(obj, 'count'), 2, 'should invoke observer after change');
});


testBoth('replacing observer should remove old observer', function(get, set) {

  var MyMixin = SC.Mixin.create({
    
    count: 0,
    
    foo: SC.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var Mixin2 = SC.Mixin.create({
    foo: SC.observer(function() {
      set(this, 'count', get(this, 'count')+10);
    }, 'baz')
  });
  
  var obj = SC.Mixin.apply({}, MyMixin, Mixin2);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equals(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', "BAZ");
  equals(get(obj, 'count'), 10, 'should invoke observer after change');

});

// ..........................................................
// Function.prototype enhancement
// 

module('Function.prototype.observes() helper');

testBoth('global observer helper takes multiple params', function(get, set) {

  if (SC.ENHANCE_PROTOTYPES === false) {
    ok('Function.prototype helper disabled');
    return ;
  }
  
  var MyMixin = SC.Mixin.create({
    
    count: 0,
    
    foo: function() {
      set(this, 'count', get(this, 'count')+1);
    }.observes('bar', 'baz')

  });

  var obj = SC.Mixin.apply({}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  set(obj, 'baz', "BAZ");
  equals(get(obj, 'count'), 2, 'should invoke observer after change');
});

