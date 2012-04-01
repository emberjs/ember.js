// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2012 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

Ember.SortArrayProxyItem = Ember.Object.extend({
  itemField: null,

  sortValue: function() {
    return this.get('itemField');
  }
});

Ember.MutableArrayTests.extend({

  name: 'Ember.SortedArrayProxy',


//  name: 'Ember.ArrayProxy',

  newObject: function(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return Ember.SortedArrayProxy.create({ content: Ember.A(ret) });
  },

  mutate: function(obj) {
    obj.pushObject(Ember.get(obj, 'length')+1);
  },

  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }

//  newObject: function(ary) {
//    var testArray = [];
//    if (ary) {
//      ary.map(function(item, index, self){
//        console.log("The ary item value is " +item+ "; the index is " +index);
//        if (item == null) {
//          testArray[index] = Ember.SortArrayProxyItem.create({itemField: item});
//        }
//        else {
//          testArray[index] = Ember.SortArrayProxyItem.create({itemField: item});
//        }
//      })
//    }
//    else {
//      this.newFixture(count).map(function(item, index, self){
//        console.log("The fixture item value is " + item+ "; the index is " + index);
//        testArray[index] = Ember.SortArrayProxyItem.create({itemField: item});
//      });
//    }
//    var emberArray = Ember.A(testArray);
//    console.log("emberArray length is " + emberArray.length);
//    console.log("emberArray contents are");
//    console.log("  " + emberArray[0]);
//    console.log("  " + emberArray[1]);
//    return Ember.SortedArrayProxy.create({ content: emberArray });
//  },
//
//  mutate: function(obj) {
//    obj.pushObject(Ember.get(obj, 'length')+1);
//  },
//
//  toArray: function(obj) {
//    return obj.toArray ? obj.toArray() : obj.slice();
//  }

}).run();
