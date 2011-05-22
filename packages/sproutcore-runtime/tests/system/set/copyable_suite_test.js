// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ..........................................................
// COPYABLE TESTS
// 
SC.CopyableTests.extend({
  name: 'SC.Set Copyable',
  
  newObject: function() {
    var set = new SC.Set();
    set.addObject(SC.generateGuid());
    return set;
  },
  
  isEqual: function(a,b) {
    if (!(a instanceof SC.Set)) return false;
    if (!(b instanceof SC.Set)) return false;
    return SC.get(a, 'firstObject') === SC.get(b, 'firstObject');
  },
  
  shouldBeFreezable: true
}).run();


