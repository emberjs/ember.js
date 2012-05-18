// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// NOTE: This test is adapted from the 1.x series of unit tests.  The tests
// are the same except for places where we intend to break the API we instead
// validate that we warn the developer appropriately.
//
//  * Changed Ember.Set.clone() call to Ember.Set.copy()

// ========================================================================
// Ember.Set Tests
// ========================================================================

var a, b, c ; // global variables

module("creating Ember.Set instances", {

  setup: function() {
    // create objects...
    a = { name: "a" } ;
    b = { name: "b" } ;
    c = { name: "c" } ;
  },

  teardown: function() {
    a = undefined ;
    b = undefined ;
    c = undefined ;
  }

});

test("new Ember.Set() should create empty set", function() {
  var set = new Ember.Set() ;
  equal(set.length, 0) ;
});

test("new Ember.Set([1,2,3]) should create set with three items in them", function() {
  var set = new Ember.Set(Ember.A([a,b,c])) ;
  equal(set.length, 3) ;
  equal(set.contains(a), true) ;
  equal(set.contains(b), true) ;
  equal(set.contains(c), true) ;
});

test("new Ember.Set() should accept anything that implements Ember.Array", function() {
  var arrayLikeObject = Ember.Object.create(Ember.Array, {
    _content: [a,b,c],
    length: 3,
    objectAt: function(idx) { return this._content[idx]; }
  }) ;

  var set = new Ember.Set(arrayLikeObject) ;
  equal(set.length, 3) ;
  equal(set.contains(a), true) ;
  equal(set.contains(b), true) ;
  equal(set.contains(c), true) ;
});

var set ; // global variables

// The tests below also end up testing the contains() method pretty
// exhaustively.
module("Ember.Set.add + Ember.Set.contains", {

  setup: function() {
    set = new Ember.Set() ;
  },

  teardown: function() {
    set = undefined ;
  }

});

test("should add an Ember.Object", function() {
  var obj = Ember.Object.create() ;

  var oldLength = set.length ;
  set.add(obj) ;
  equal(set.contains(obj), true, "contains()") ;
  equal(set.length, oldLength+1, "new set length") ;
});

test("should add a regular hash", function() {
  var obj = {} ;

  var oldLength = set.length ;
  set.add(obj) ;
  equal(set.contains(obj), true, "contains()") ;
  equal(set.length, oldLength+1, "new set length") ;
});

test("should add a string", function() {
  var obj = "String!" ;

  var oldLength = set.length ;
  set.add(obj) ;
  equal(set.contains(obj), true, "contains()") ;
  equal(set.length, oldLength+1, "new set length") ;
});

test("should add a number", function() {
  var obj = 23 ;

  var oldLength = set.length ;
  set.add(obj) ;
  equal(set.contains(obj), true, "contains()") ;
  equal(set.length, oldLength+1, "new set length") ;
});

test("should add bools", function() {
  var oldLength = set.length ;

  set.add(true) ;
  equal(set.contains(true), true, "contains(true)");
  equal(set.length, oldLength+1, "new set length");

  set.add(false);
  equal(set.contains(false), true, "contains(false)");
  equal(set.length, oldLength+2, "new set length");
});

test("should add 0", function() {
  var oldLength = set.length ;

  set.add(0) ;
  equal(set.contains(0), true, "contains(0)");
  equal(set.length, oldLength+1, "new set length");
});

test("should add a function", function() {
  var obj = function() { return "Test function"; } ;

  var oldLength = set.length ;
  set.add(obj) ;
  equal(set.contains(obj), true, "contains()") ;
  equal(set.length, oldLength+1, "new set length") ;
});

test("should NOT add a null", function() {
  set.add(null) ;
  equal(set.length, 0) ;
  equal(set.contains(null), false) ;
});

test("should NOT add an undefined", function() {
  set.add(undefined) ;
  equal(set.length, 0) ;
  equal(set.contains(undefined), false) ;
});

test("adding an item, removing it, adding another item", function() {
  var item1 = "item1" ;
  var item2 = "item2" ;

  set.add(item1) ; // add to set
  set.remove(item1) ; //remove from set
  set.add(item2) ;

  equal(set.contains(item1), false, "set.contains(item1)") ;

  set.add(item1) ; // re-add to set
  equal(set.length, 2, "set.length") ;
});

module("Ember.Set.remove + Ember.Set.contains", {

  // generate a set with every type of object, but none of the specific
  // ones we add in the tests below...
  setup: function() {
    set = new Ember.Set(Ember.A([
      Ember.Object.create({ dummy: true }),
      { isHash: true },
      "Not the String",
      16, true, false, 0])) ;
  },

  teardown: function() {
    set = undefined ;
  }

});

test("should remove an Ember.Object and reduce length", function() {
  var obj = Ember.Object.create() ;
  set.add(obj) ;
  equal(set.contains(obj), true) ;
  var oldLength = set.length ;

  set.remove(obj) ;
  equal(set.contains(obj), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a regular hash and reduce length", function() {
  var obj = {} ;
  set.add(obj) ;
  equal(set.contains(obj), true) ;
  var oldLength = set.length ;

  set.remove(obj) ;
  equal(set.contains(obj), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a string and reduce length", function() {
  var obj = "String!" ;
  set.add(obj) ;
  equal(set.contains(obj), true) ;
  var oldLength = set.length ;

  set.remove(obj) ;
  equal(set.contains(obj), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a number and reduce length", function() {
  var obj = 23 ;
  set.add(obj) ;
  equal(set.contains(obj), true) ;
  var oldLength = set.length ;

  set.remove(obj) ;
  equal(set.contains(obj), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a bools and reduce length", function() {
  var oldLength = set.length ;
  set.remove(true) ;
  equal(set.contains(true), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;

  set.remove(false);
  equal(set.contains(false), false, "should be removed") ;
  equal(set.length, oldLength-2, "should be 2 shorter") ;
});

test("should remove 0 and reduce length", function(){
  var oldLength = set.length;
  set.remove(0) ;
  equal(set.contains(0), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a function and reduce length", function() {
  var obj = function() { return "Test function"; } ;
  set.add(obj) ;
  equal(set.contains(obj), true) ;
  var oldLength = set.length ;

  set.remove(obj) ;
  equal(set.contains(obj), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should NOT remove a null", function() {
  var oldLength = set.length ;
  set.remove(null) ;
  equal(set.length, oldLength) ;
});

test("should NOT remove an undefined", function() {
  var oldLength = set.length ;
  set.remove(undefined) ;
  equal(set.length, oldLength) ;
});

test("should ignore removing an object not in the set", function() {
  var obj = Ember.Object.create() ;
  var oldLength = set.length ;
  set.remove(obj) ;
  equal(set.length, oldLength) ;
});

module("Ember.Set.pop + Ember.Set.copy", {
// generate a set with every type of object, but none of the specific
// ones we add in the tests below...
  setup: function() {
    set = new Ember.Set(Ember.A([
      Ember.Object.create({ dummy: true }),
      { isHash: true },
      "Not the String",
      16, false])) ;
    },

    teardown: function() {
      set = undefined ;
    }
});

test("the pop() should remove an arbitrary object from the set", function() {
  var oldLength = set.length ;
  var obj = set.pop();
  ok(!Ember.none(obj), 'pops up an item');
  equal(set.length, oldLength-1, 'length shorter by 1');
});

test("should pop false and 0", function(){
  set = new Ember.Set(Ember.A([false]));
  ok(set.pop() === false, "should pop false");

  set = new Ember.Set(Ember.A([0]));
  ok(set.pop() === 0, "should pop 0");
});

test("the copy() should return an indentical set", function() {
  var oldLength = set.length ;
  var obj = set.copy();
  equal(oldLength,obj.length,'length of the clone should be same');
  equal(obj.contains(set[0]), true);
  equal(obj.contains(set[1]), true);
  equal(obj.contains(set[2]), true);
  equal(obj.contains(set[3]), true);
  equal(obj.contains(set[4]), true);
});
