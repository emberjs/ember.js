// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/~tests/suites/copyable');

// NOTE: See debug/suites/copyable.js for mosts tests

var CopyableObject = SC.Object.extend(SC.Copyable, {
  
  id: null,
  
  init: function() {
    this._super();
    SC.set(this, 'id', SC.generateGuid());
  },
  
  copy: function() {
    var ret = new CopyableObject();
    SC.set(ret, 'id', SC.get(this, 'id'));
    return ret;
  }
});

SC.CopyableTests.extend({
  
  name: 'SC.Copyable Basic Test',
  
  newObject: function() {
    return new CopyableObject();
  },
  
  isEqual: function(a, b) {
    if (!(a instanceof CopyableObject) || !(b instanceof CopyableObject)) return false;
    return SC.get(a, 'id') === SC.get(b,'id');
  }
}).run();
