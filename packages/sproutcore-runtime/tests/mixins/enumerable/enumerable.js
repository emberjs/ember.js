// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals module test ok isObj equals expects */

var enumerables ; // global variables

var DummyEnumerable = SC.Object.extend( SC.Enumerable, {

  content: [],

  length: function() { return this.content.length; }.property(),

  objectAt: function(idx) { return this.content[idx]; },

  nextObject: function(idx) { return this.content[idx]; },

  // add support for reduced properties.
  unknownProperty: function(key, value) {
    var ret = this.reducedProperty(key, value) ;
    if (ret === undefined) {
      if (value !== undefined) this[key] = value ;
      ret = value ;
    }
    return ret ;
  },

  pushObject: function(object) {
    this.content.push(object) ;
    this.enumerableContentDidChange() ;
  }

});

var runFunc = function(a,b) { return ['DONE', a, b]; } ;
var reduceTestFunc = function(prev, item, idx, e, pname) { return pname||'TEST'; } ;

var CommonArray = [
  {
    first: "Charles",
    gender: "male",
    californian: NO,
    ready: YES,
    visited: "Prague",
    doneTravelling: NO,
    run: runFunc,
    balance: 1
  },

  {
    first: "Jenna",
    gender: "female",
    californian: YES,
    ready: YES,
    visited: "Prague",
    doneTravelling: NO,
    run: runFunc,
    balance: 2
  },

  {
    first: "Peter",
    gender: "male",
    californian: NO,
    ready: YES,
    visited: "Prague",
    doneTravelling: NO,
    run: runFunc,
    balance: 3
  },

  {
    first: "Chris",
    gender: "male",
    californian: NO,
    ready: YES,
    visited: "Prague",
    doneTravelling: NO,
    run: runFunc,
    balance: 4
  }
];

module("Real Array & DummyEnumerable", {

  setup: function() {
    enumerables = [SC.$A(CommonArray), DummyEnumerable.create({ content: CommonArray })] ;
  },

  teardown: function() {
    delete enumerables;
    delete Array.prototype["@max(balance)"] ; // remove cached value
    delete Array.prototype["@min(balance)"] ;
  }

});

test("should return firstObject for item with content", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    equals(src.firstObject(), CommonArray[0], 'firstObject should return first object');
  }

  equals([].firstObject(), undefined, 'firstObject() on empty enumerable should return undefined');
});

test("should run forEach() to go through objects", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var idx = 0;

    // save for testing later
    var items = [] ;
    var indexes = [] ;
    var arrays = [] ;
    var targets = [] ;

    src.forEach(function(item, index, array) {
      items.push(item);
      indexes.push(index);
      arrays.push(array);
      targets.push(this);
    }, this);

    var len = src.get('length') ;
    for(idx=0;idx<len;idx++) {
      equals(items[idx], src.objectAt(idx)) ;
      equals(indexes[idx], idx) ;
      equals(arrays[idx], src) ;

      // use this method because equals() is taking too much time to log out
      // results.  probably an issue with jsDump
      ok(targets[idx] === this, 'target should always be this') ;
    }
  }
});

test("should map to values while passing proper params", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var idx = 0;

    // save for testing later
    var items = [] ;
    var indexes = [] ;
    var arrays = [] ;
    var targets = [] ;

    var mapped = src.map(function(item, index, array) {
      items.push(item);
      indexes.push(index);
      arrays.push(array);
      targets.push(this);

      return index ;
    }, this);

    var len = src.get('length') ;
    for(idx=0;idx<len;idx++) {
      equals(src.objectAt(idx), items[idx], "items") ;
      equals(idx, indexes[idx], "indexes") ;
      equals(src, arrays[idx], 'arrays') ;
      equals(SC.guidFor(this), SC.guidFor(targets[idx]), "this") ;

      equals(idx, mapped[idx], "mapped") ;
    }
  }
});

test("should filter to items that return for callback", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var idx = 0;

    // save for testing later
    var items = [] ;
    var indexes = [] ;
    var arrays = [] ;
    var targets = [] ;

    var filtered = src.filter(function(item, index, array) {
      items.push(item);
      indexes.push(index);
      arrays.push(array);
      targets.push(this);

      return item.gender === "female" ;
    }, this);

    var len = src.get('length') ;
    for(idx=0;idx<len;idx++) {
      equals(src.objectAt(idx), items[idx], "items") ;
      equals(idx, indexes[idx], "indexes") ;
      equals(src, arrays[idx], 'arrays') ;
      equals(SC.guidFor(this), SC.guidFor(targets[idx]), "this") ;
    }

    equals(filtered.length, 1) ;
    equals(filtered[0].first, "Jenna") ;
  }
});

test("should return true if function for every() returns true", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var idx = 0 ;

    // save for testing later
    var items = [] ;
    var indexes = [] ;
    var arrays = [] ;
    var targets = [] ;

    var result = src.every(function(item, index, array) {
      items.push(item) ;
      indexes.push(index) ;
      arrays.push(array) ;
      targets.push(this) ;

      return true ;
    }, this);

    var len = src.get('length') ;
    for(idx=0;idx<len;idx++) {
      equals(src.objectAt(idx), items[idx], "items") ;
      equals(idx, indexes[idx], "indexes") ;
      equals(src, arrays[idx], 'arrays') ;
      equals(SC.guidFor(this), SC.guidFor(targets[idx]), "this") ;
    }

    equals(result, YES) ;
  }
});

test("should return false if one function for every() returns false", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var result = src.every(function(item, index, array) {
      return item.gender === "male" ;
    }, this);
    equals(result, NO) ;
  }
});

test("should return false if all functions for some() returns false", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var idx = 0 ;

    // save for testing later
    var items = [] ;
    var indexes = [] ;
    var arrays = [] ;
    var targets = [] ;

    var result = src.some(function(item, index, array) {
      items.push(item) ;
      indexes.push(index) ;
      arrays.push(array) ;
      targets.push(this) ;

      return false ;
    }, this);

    var len = src.get('length') ;
    for(idx=0;idx<len;idx++) {
      equals(src.objectAt(idx), items[idx], "items") ;
      equals(idx, indexes[idx], "indexes") ;
      equals(src, arrays[idx], 'arrays') ;
      equals(SC.guidFor(this), SC.guidFor(targets[idx]), "this") ;
    }

    equals(result, NO) ;
  }
});

test("should return true if one function for some() returns true", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var result = src.some(function(item, index, array) {
      return item.gender !== "male" ;
    }, this);
    equals(result, YES) ;
  }
});

test("should mapProperty for all items", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var mapped = src.mapProperty("first") ;
    var idx ;
    var len = src.get('length') ;
    for(idx=0;idx<len;idx++) {
      equals(mapped[idx], src.objectAt(idx).first) ;
    }
  }
});

test("should filterProperty with match", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var filtered = src.filterProperty("gender", "female") ;
    equals(filtered.length, 1) ;
    equals(filtered[0].first, "Jenna") ;
  }
});

test("should filterProperty with default bool", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var filtered = src.filterProperty("californian") ;
    equals(filtered.length, 1) ;
    equals(filtered[0].first, "Jenna") ;
  }
});

test("everyProperty should return true if all properties macth", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var ret = src.everyProperty('visited', 'Prague') ;
    equals(YES, ret, "visited") ;
  }
});

test("everyProperty should return true if all properties true", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var ret = src.everyProperty('ready') ;
    equals(YES, ret, "ready") ;
  }
});

test("everyProperty should return false if any properties false", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var ret = src.everyProperty('gender', 'male') ;
    equals(NO, ret, "ready") ;
  }
});

test("someProperty should return false if all properties not match", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var ret = src.someProperty('visited', 'Timbuktu') ;
    equals(NO, ret, "visited") ;
  }
});

test("someProperty should return false if all properties false", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var ret = src.someProperty('doneTravelling') ;
    equals(NO, ret, "doneTravelling") ;
  }
});

test("someProperty should return true if any properties true", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var ret = src.someProperty('first', 'Charles') ;
    equals(YES, ret, "first") ;
  }
});

test("should find the first element matching the criteria", function() {
  var people = enumerables[1] ;
  var jenna = people.find(function(person) { return person.gender == 'female'; });
  equals(jenna.first, 'Jenna');
});

