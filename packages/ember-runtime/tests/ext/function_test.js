// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth */

require('ember-runtime/~tests/props_helper');

module('Function.prototype.observes() helper');

testBoth('global observer helper takes multiple params', function(get, set) {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok('Function.prototype helper disabled');
    return ;
  }
  
  var MyMixin = Ember.Mixin.create({
    
    count: 0,
    
    foo: function() {
      set(this, 'count', get(this, 'count')+1);
    }.observes('bar', 'baz')

  });

  var obj = Ember.mixin({}, MyMixin);
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  set(obj, 'baz', "BAZ");
  equals(get(obj, 'count'), 2, 'should invoke observer after change');
});

