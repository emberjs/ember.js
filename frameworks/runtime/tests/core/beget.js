// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.guidFor Tests
// ========================================================================
/*globals module test ok isObj equals expects */

var objectA, objectB , arrayA, stringA; // global variables

module("Beget function Module", {
setup: function() {
    objectA = {} ;
    objectB = {} ;
	arrayA  = [1,3];
	stringA ="stringA";
}
});

test("should return a new object with same prototype as that of passed object", function() {
  	equals(YES, SC.beget(objectA) !== objectA, "Beget for an object") ;
	equals(YES, SC.beget(stringA) !== stringA, "Beget for a string") ;
	equals(YES, SC.beget(SC.hashFor(objectB))!==SC.hashFor(objectB), "Beget for a hash") ;
	equals(YES, SC.beget(arrayA) !== arrayA, "Beget for an array") ;
});

