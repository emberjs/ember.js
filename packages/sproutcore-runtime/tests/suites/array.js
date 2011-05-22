// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/~tests/suites/enumerable');



var ObserverClass =   SC.EnumerableTests.ObserverClass.extend({
    
   observeArray: function(obj) {
    obj.addArrayObserver(this);
    return this;
  },
  
  stopObserveArray: function(obj) {
    obj.removeArrayObserver(this);
    return this;
  },
  
  arrayWillChange: function() {
    equals(this._before, null, 'should only call once');
    this._before = Array.prototype.slice.call(arguments);
  },

  arrayDidChange: function() {
    equals(this._after, null, 'should only call once');
    this._after = Array.prototype.slice.call(arguments);
  }
  
});

SC.ArrayTests = SC.EnumerableTests.extend({
  
  observerClass: ObserverClass
  
});

SC.ArrayTests.ObserverClass = ObserverClass;

require('./array/indexOf');
require('./array/objectAt');
