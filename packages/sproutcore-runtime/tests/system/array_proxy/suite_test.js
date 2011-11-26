// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.MutableArrayTests.extend({
  
  name: 'SC.ArrayProxy',
  
  newObject: function(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return SC.ArrayProxy.create({ content: SC.A(ret) });
  },

  mutate: function(obj) {
    obj.pushObject(SC.get(obj, 'length')+1);
  },
  
  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }
  
}).run();



