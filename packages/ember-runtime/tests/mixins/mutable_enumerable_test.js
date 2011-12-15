// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_enumerable');

/*
  Implement a basic fake mutable array.  This validates that any non-native
  enumerable can impl this API.
*/
var TestMutableEnumerable = Ember.Object.extend(Ember.MutableEnumerable, {

  _content: null,
  
  addObject: function(obj) {
    if (this._content.indexOf(obj)>=0) return this;
    this.enumerableContentWillChange(null, [obj]);
    this._content.push(obj);    
    this.enumerableContentDidChange(null, [obj]);
  },
  
  removeObject: function(obj) {
    var idx = this._content.indexOf(obj);
    if (idx<0) return this;

    this.enumerableContentWillChange([obj], null);
    this._content.splice(idx, 1);
    this.enumerableContentDidChange([obj], null);
    return this;
  },
  
  init: function(ary) {
    this._content = ary || [];
  },
  
  nextObject: function(idx) {
    return idx>=Ember.get(this, 'length') ? undefined : this._content[idx];
  },
  
  length: Ember.computed(function() {
    return this._content.length;
  }).property('[]').cacheable(),
  
  slice: function() {
    return this._content.slice();
  }  
});


Ember.MutableEnumerableTests.extend({
  
  name: 'Basic Mutable Array',
    
  newObject: function(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    return new TestMutableEnumerable(ary);
  },
  
  // allows for testing of the basic enumerable after an internal mutation
  mutate: function(obj) {
    obj.addObject(this.getFixture(1)[0]);
  },
  
  toArray: function(obj) {
    return obj.slice();
  }
  
}).run();



