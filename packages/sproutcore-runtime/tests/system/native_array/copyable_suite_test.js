// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ..........................................................
// COPYABLE TESTS
// 
SC.CopyableTests.extend({
  name: 'NativeArray Copyable',
  
  newObject: function() {
    return SC.A([SC.generateGuid()]);
  },
  
  isEqual: function(a,b) {
    if (!(a instanceof Array)) return false;
    if (!(b instanceof Array)) return false;
    if (a.length !== b.length) return false;
    return a[0]===b[0];
  },
  
  shouldBeFreezable: false
}).run();


