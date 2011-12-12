// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ..........................................................
// COPYABLE TESTS
// 
Ember.CopyableTests.extend({
  name: 'NativeArray Copyable',
  
  newObject: function() {
    return Ember.A([Ember.generateGuid()]);
  },
  
  isEqual: function(a,b) {
    if (!(a instanceof Array)) return false;
    if (!(b instanceof Array)) return false;
    if (a.length !== b.length) return false;
    return a[0]===b[0];
  },
  
  shouldBeFreezable: false
}).run();


