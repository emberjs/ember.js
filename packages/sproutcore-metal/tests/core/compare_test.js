// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

// test parsing of query string
var v = [];
module("SC.compare()", {
  setup: function() {
    // setup dummy data
    v[0]  = null;
    v[1]  = false;
    v[2]  = true;
    v[3]  = -12;
    v[4]  = 3.5;
    v[5]  = 'a string';
    v[6]  = 'another string';
    v[7]  = 'last string';
    v[8]  = [1,2];
    v[9]  = [1,2,3];
    v[10] = [1,3];
    v[11] = {a: 'hash'};
    v[12] = SC.Object.create();
    v[13] = function (a) {return a;};
  }
});


// ..........................................................
// TESTS
// 

test("ordering should work", function() {
  for (var j=0; j < v.length; j++) {
    equals(SC.compare(v[j],v[j]), 0, j +' should equal itself');
    for (var i=j+1; i < v.length; i++) {
      equals(SC.compare(v[j],v[i]), -1, 'v[' + j + '] (' + SC.typeOf(v[j]) + ') should be smaller than v[' + i + '] (' + SC.typeOf(v[i]) + ')' );
    }
    
  }
}); 
  
