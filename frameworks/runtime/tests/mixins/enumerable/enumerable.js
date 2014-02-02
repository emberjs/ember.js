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

  shiftObject: function() {
    var ret = this.content.shift();
    this.enumerableContentDidChange(0, 1);
    return ret;
  },

  pushObject: function(object) {
    this.content.push(object) ;
    this.enumerableContentDidChange(this.content.length - 2, 1);
  }

});

var runFunc = function(a,b) { return ['DONE', a, b]; } ;
var invokeWhileOK = function() { return "OK"; } ;
var invokeWhileNotOK = function() { return "FAIL"; };
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
    invokeWhileTest: invokeWhileOK,
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
    invokeWhileTest: invokeWhileOK,
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
    invokeWhileTest: invokeWhileNotOK,
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
    invokeWhileTest: invokeWhileOK,
    balance: 4
  }
];

module("Real Array & DummyEnumerable", {

  setup: function() {
    enumerables = [SC.$A(CommonArray), DummyEnumerable.create({ content: SC.clone(CommonArray) })] ;
  },

  teardown: function() {
    delete enumerables;
    delete Array.prototype["@max(balance)"] ; // remove cached value
    delete Array.prototype["@min(balance)"] ;
  }

});

test("should get enumerator that iterates through objects", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var e = src.enumerator() ;
    ok(e !== null, 'enumerator must not be null');

    var idx = 0;
    var cur ;
    while(cur = e.nextObject()) {
      equals(src.objectAt(idx), cur, "object at index %@".fmt(idx)) ;
      idx++;
    }

    equals(src.get('length'), idx) ;
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

test("should groupBy a given property", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var filtered = src.groupBy("gender") ;
    equals(filtered.length, 2) ;
    equals(filtered[1][0].first, "Jenna") ;
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

test("invokeWhile should call method on member objects until return does not match", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    var ret = src.invokeWhile("OK", "invokeWhileTest", "item2") ;
    equals("FAIL", ret, "return value");
  }
});

test("get @min(balance) should return the minimum balance", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    equals(1, src.get('@min(balance)')) ;
  }
});

test("get @max(balance) should return the maximum balance", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    equals(4, src.get('@max(balance)')) ;
  }
});

test("get @minObject(balance) should return the record with min balance", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    equals(src.objectAt(0), src.get('@minObject(balance)')) ;
  }
});

test("get @maxObject(balance) should return the record with the max balance", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    equals(src.objectAt(3), src.get('@maxObject(balance)')) ;
  }
});

test("get @sum(balance) should return the sum of the balances.", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    equals(1+2+3+4, src.get("@sum(balance)")) ;
  }
});

test("get @average(balance) should return the average of balances", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    equals((1+2+3+4)/4, src.get("@average(balance)")) ;
  }
});

test("should invoke custom reducer", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    // install reducer method
    src.reduceTest = reduceTestFunc ;
    equals("TEST", src.get("@test")) ;
    equals("prop", src.get("@test(prop)")) ;
  }
});

test("should trigger observer on property when lastObject changes", function() {
  var src, ary2 = enumerables;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2];

    var callCount = 0;
    src.addObserver("lastObject", function() {
      callCount++;
    });

    src.pushObject({
      first: "John",
      gender: "male",
      californian: NO,
      ready: YES,
      visited: "Paris",
      balance: 5
    });

    equals(callCount, 1, "callCount");
  }
});

test("should trigger observer on property when firstObject changes", function() {
  var src, ary2 = enumerables;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;

    var callCount = 0;
    src.addObserver("firstObject", function() {
      callCount++;
    });

    src.shiftObject();

    equals(callCount, 1, "callCount");
  }
});

test("should trigger observer of reduced prop when array changes once property retrieved once", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    // get the property...this will install the reducer property...
    src.get("@max(balance)") ;

    // install observer
    var observedValue = null ;
    src.addObserver("@max(balance)", function() {
      observedValue = src.get("@max(balance)");
    }) ;

    //src.addProbe('[]') ;
    //src.addProbe('@max(balance)');

    // add record to array
    src.pushObject({
      first: "John",
      gender: "male",
      californian: NO,
      ready: YES,
      visited: "Paris",
      balance: 5
    }) ;

    //SC.NotificationQueue.flush() ; // force observers to trigger

    // observed value should now be set because the reduced property observer
    // was triggered when we changed the array contents.
    equals(5, observedValue, "observedValue") ;
  }
});


test("should trigger observer of reduced prop when array changes - even if you never retrieved the property before", function() {
  var src, ary2 = enumerables ;
  for (var idx2=0, len2=ary2.length; idx2<len2; idx2++) {
    src = ary2[idx2] ;
    // install observer
    var observedValue = null ;
    src.addObserver("@max(balance)", function() {
      observedValue = src.get("@max(balance)");
    }) ;

    // add record to array
    src.pushObject({
      first: "John",
      gender: "male",
      californian: NO,
      ready: YES,
      visited: "Paris",
      balance: 5
    }) ;

    //SC.NotificationQueue.flush() ; // force observers to trigger

    // observed value should now be set because the reduced property observer
    // was triggered when we changed the array contents.
    equals(5, observedValue, "observedValue") ;
  }
});

test("should find the first element matching the criteria", function() {
  var people = enumerables[1] ;
  var jenna = people.find(function(person) { return person.gender == 'female'; });
  equals(jenna.first, 'Jenna');
});

var source ; // global variables

module("Real Array", {

  setup: function() {
    source = SC.$A(CommonArray);
  },

  teardown: function() {
    delete source ;

    delete Array.prototype["@max(balance)"] ; // remove cached value
    delete Array.prototype["@min(balance)"] ;
  }

});

/*
  This is a particular problem because reduced properties are registered
  as dependent keys, which are not automatically configured in native
  Arrays (where the SC.Object.init method is not run).

  The fix for this problem was to add an initObservable() method to
  SC.Observable that will configure bindings and dependent keys.  This
  method is called from SC.Object.init() and it is called in
  SC.Observable._notifyPropertyChanges if it has not been called already.

  SC.Enumerable was in turn modified to register reducers as dependent
  keys so that now they will be registered on the Array before any
  property change notifications are sent.
*/
test("should notify observers even if reduced property is cached on prototype", function() {
  // make sure reduced property is cached
  source.get("@max(balance)") ;

  // now make a clone and observe
  source = SC.$A(CommonArray) ;

  // get the property...this will install the reducer property...
  source.get("@max(balance)") ;

  // install observer
  var observedValue = null ;
  source.addObserver("@max(balance)", function() {
    observedValue = source.get("@max(balance)");
  }) ;

  //source.addProbe('[]') ;
  //source.addProbe('@max(balance)');

  // add record to array
  source.pushObject({
    first: "John",
    gender: "male",
    californian: NO,
    ready: YES,
    visited: "Paris",
    balance: 5
  }) ;

  //SC.NotificationQueue.flush() ; // force observers to trigger

  // observed value should now be set because the reduced property observer
  // was triggered when we changed the array contents.
  equals(5, observedValue, "observedValue") ;
});
