// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals module test ok equals expects object same */

var object ;

module("Cloned Objects", {
  setup: function() {
    
	object = SC.Object.create({
	
	  name:'Cloned Object',
	  value:'value1',
	 
	  clone: function(object) {
	    var ret = object ;
	    switch (SC.typeOf(object)) {
	  
	  	 case SC.T_ARRAY:
	        ret = object.slice() ;
	    	break ;

	     case SC.T_OBJECT:
	        ret = {} ;
	        for(var key in object) ret[key] = object[key] ;
	    }

	    return ret ;
	  }
	});
  }
});


test("should return a cloned object", function() {
	var objectA = [1,2,3,4,5] ;
	var objectB = "SproutCore" ;
	var objectC = SC.hashFor(objectA);	
	var objectE = 100;
	var a = SC.clone(objectA);
	var b = SC.clone(objectA);
	
  	equals(SC.clone(objectB), SC.clone(objectB)) ;
	equals(SC.clone(objectC), SC.clone(objectC)) ;
	equals(SC.clone(objectE), SC.clone(objectE)) ;
	same(a, b);
});

test("should return cloned object when the object is null", function() {
	var objectD = null;
  	equals(SC.clone(objectD), SC.clone(objectD)) ;
});

test("should return a cloned array ", function() {
	var arrayA  = ['value1','value2'] ;
	var resultArray = object.clone(arrayA);
    equals(resultArray[0], arrayA[0], 'check first array item');
    equals(resultArray[1], arrayA[1], 'check first array item');
});

test("should return a deeply cloned arrays", function() {
  var original  = [{value: 'value1'}, SC.Object.create({value: 'value2'})] ;
  var cloned = SC.clone(original, true);
  original[0].value = 'bogus';
  equals(cloned[0].value, 'value1');
  original[1].set('value', 'bogus');
  equals(cloned[1].get('value'), 'value2');
});

test("should return shallow clones of hashes", function() {
  var original = { foo: 'bar', nested: { key: 'value'}} ;
  var cloned = SC.clone(original) ;
  same(original, cloned);
  cloned.nested.key = 'another value' ;
  equals(original.nested.key, 'another value') ;
});

test("should return deep clones of hashes", function() {
  var original = { foo: 'bar', nested: { key: 'value'}} ;
  var cloned = SC.clone(original, true) ;
  same(original, cloned);
  cloned.nested.key = 'another value' ;
  equals(original.nested.key, 'value') ;
});

test("should use copy() if isCopyable", function() {
  var obj = SC.Object.create(SC.Copyable, {
    isCopy: NO,
    
    copy: function() {
      return SC.Object.create(SC.Copyable, { isCopy: YES });
    }
    
  });
  
  var copy = SC.clone(obj);
  ok(!!copy, 'clone should return a copy');
  equals(copy.isCopy, YES, 'copy.isCopy should be YES');
});

test("SC.copy should be an alias for SC.clone", function() {
  equals(SC.copy, SC.clone, 'SC.copy should equal SC.clone');
});
