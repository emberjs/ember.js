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
/*globals module test ok isObj equals expects */

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

test("Ember.Set.create() should create empty set", function() {
  var set = Ember.Set.create() ;
  equals(set.length, 0) ;
});

test("Ember.Set.create([1,2,3]) should create set with three items in them", function() {
  var set = Ember.Set.create(Ember.A([a,b,c])) ;
  equals(set.length, 3) ;
  equals(set.contains(a), YES) ;
  equals(set.contains(b), YES) ;
  equals(set.contains(c), YES) ;
});

test("Ember.Set.create() should accept anything that implements Ember.Array", function() {
  var arrayLikeObject = Ember.Object.create(Ember.Array, {
    _content: [a,b,c],
    length: 3,
    objectAt: function(idx) { return this._content[idx]; } 
  }) ;
  
  var set = Ember.Set.create(arrayLikeObject) ;
  equals(set.length, 3) ;
  equals(set.contains(a), YES) ;
  equals(set.contains(b), YES) ;
  equals(set.contains(c), YES) ;
});

var set ; // global variables

// The tests below also end up testing the contains() method pretty 
// exhaustively.
module("Ember.Set.add + Ember.Set.contains", {
  
  setup: function() {
    set = Ember.Set.create() ;
  },
  
  teardown: function() {
    set = undefined ;
  }
  
});

test("should add an Ember.Object", function() {
  var obj = Ember.Object.create() ;
  
  var oldLength = set.length ;
  set.add(obj) ;
  equals(set.contains(obj), YES, "contains()") ;
  equals(set.length, oldLength+1, "new set length") ;
});

test("should add a regular hash", function() {
  var obj = {} ;
  
  var oldLength = set.length ;
  set.add(obj) ;
  equals(set.contains(obj), YES, "contains()") ;
  equals(set.length, oldLength+1, "new set length") ;
});

test("should add a string", function() {
  var obj = "String!" ;
  
  var oldLength = set.length ;
  set.add(obj) ;
  equals(set.contains(obj), YES, "contains()") ;
  equals(set.length, oldLength+1, "new set length") ;
});

test("should add a number", function() {
  var obj = 23 ;
  
  var oldLength = set.length ;
  set.add(obj) ;
  equals(set.contains(obj), YES, "contains()") ;
  equals(set.length, oldLength+1, "new set length") ;
});

test("should add bools", function() {
  var oldLength = set.length ;

  set.add(true) ;
  equals(set.contains(true), YES, "contains(true)");
  equals(set.length, oldLength+1, "new set length");

  set.add(false);
  equals(set.contains(false), YES, "contains(false)");
  equals(set.length, oldLength+2, "new set length");
});

test("should add 0", function() {
  var oldLength = set.length ;

  set.add(0) ;
  equals(set.contains(0), YES, "contains(0)");
  equals(set.length, oldLength+1, "new set length");
});

test("should add a function", function() {
  var obj = function() { return "Test function"; } ;
  
  var oldLength = set.length ;
  set.add(obj) ;
  equals(set.contains(obj), YES, "contains()") ;
  equals(set.length, oldLength+1, "new set length") ;
});

test("should NOT add a null", function() {
  set.add(null) ;
  equals(set.length, 0) ;
  equals(set.contains(null), NO) ;
});

test("should NOT add an undefined", function() {
  set.add(undefined) ;
  equals(set.length, 0) ;
  equals(set.contains(undefined), NO) ;
});

test("adding an item, removing it, adding another item", function() {
  var item1 = "item1" ;
  var item2 = "item2" ;

  set.add(item1) ; // add to set
  set.remove(item1) ; //remove from set
  set.add(item2) ;
  
  equals(set.contains(item1), NO, "set.contains(item1)") ;
  
  set.add(item1) ; // re-add to set
  equals(set.length, 2, "set.length") ;
});

module("Ember.Set.remove + Ember.Set.contains", {
  
  // generate a set with every type of object, but none of the specific
  // ones we add in the tests below...
  setup: function() {
    set = Ember.Set.create(Ember.A([
      Ember.Object.create({ dummy: YES }),
      { isHash: YES },
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
  equals(set.contains(obj), YES) ;
  var oldLength = set.length ;
  
  set.remove(obj) ;
  equals(set.contains(obj), NO, "should be removed") ;
  equals(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a regular hash and reduce length", function() {
  var obj = {} ;
  set.add(obj) ;
  equals(set.contains(obj), YES) ;
  var oldLength = set.length ;
  
  set.remove(obj) ;
  equals(set.contains(obj), NO, "should be removed") ;
  equals(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a string and reduce length", function() {
  var obj = "String!" ;
  set.add(obj) ;
  equals(set.contains(obj), YES) ;
  var oldLength = set.length ;
  
  set.remove(obj) ;
  equals(set.contains(obj), NO, "should be removed") ;
  equals(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a number and reduce length", function() {
  var obj = 23 ;
  set.add(obj) ;
  equals(set.contains(obj), YES) ;
  var oldLength = set.length ;
  
  set.remove(obj) ;
  equals(set.contains(obj), NO, "should be removed") ;
  equals(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a bools and reduce length", function() {
  var oldLength = set.length ;
  set.remove(true) ;
  equals(set.contains(true), NO, "should be removed") ;
  equals(set.length, oldLength-1, "should be 1 shorter") ;

  set.remove(false);
  equals(set.contains(false), NO, "should be removed") ;
  equals(set.length, oldLength-2, "should be 2 shorter") ;
});

test("should remove 0 and reduce length", function(){
  var oldLength = set.length;
  set.remove(0) ;
  equals(set.contains(0), NO, "should be removed") ;
  equals(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a function and reduce length", function() {
  var obj = function() { return "Test function"; } ;
  set.add(obj) ;
  equals(set.contains(obj), YES) ;
  var oldLength = set.length ;
  
  set.remove(obj) ;
  equals(set.contains(obj), NO, "should be removed") ;
  equals(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should NOT remove a null", function() {
  var oldLength = set.length ;
  set.remove(null) ;
  equals(set.length, oldLength) ;
});

test("should NOT remove an undefined", function() {
  var oldLength = set.length ;
  set.remove(undefined) ;
  equals(set.length, oldLength) ;
});

test("should ignore removing an object not in the set", function() {
  var obj = Ember.Object.create() ;
  var oldLength = set.length ;
  set.remove(obj) ;
  equals(set.length, oldLength) ;
});

// test("should remove all the elements in the set", function() {
// 	var obj = [2,3,4];
// 	set.add(obj) ;
// 	var oldLength = set.length ;
// 	equals(oldLength, 6);
// 	a = set.removeEach(obj);
// 	equals(a.length, 0);
// });

module("Ember.Set.pop + Ember.Set.copy", {
// generate a set with every type of object, but none of the specific
// ones we add in the tests below...
	setup: function() {
		set = Ember.Set.create(Ember.A([
			Ember.Object.create({ dummy: YES }),
			{ isHash: YES },
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
	equals(set.length, oldLength-1, 'length shorter by 1');
});

test("should pop false and 0", function(){
  set = Ember.Set.create(Ember.A([false]));
  ok(set.pop() === false, "should pop false");

  set = Ember.Set.create(Ember.A([0]));
  ok(set.pop() === 0, "should pop 0");
});

test("the copy() should return an indentical set", function() {
	var oldLength = set.length ;
	var obj = set.copy();
	equals(oldLength,obj.length,'length of the clone should be same');
	equals(obj.contains(set[0]), YES);
	equals(obj.contains(set[1]), YES);
	equals(obj.contains(set[2]), YES);
	equals(obj.contains(set[3]), YES);
	equals(obj.contains(set[4]), YES);
});
