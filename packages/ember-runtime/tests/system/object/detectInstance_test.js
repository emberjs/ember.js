// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/object/detectInstance');

test('detectInstance detects instances correctly', function() {

  var A = Ember.Object.extend();
  var B = A.extend();
  var C = A.extend();

  var o = Ember.Object.create(),
      a = A.create(),
      b = B.create(),
      c = C.create();

  ok( Ember.Object.detectInstance(o), 'o is an instance of Ember.Object' );
  ok( Ember.Object.detectInstance(a), 'a is an instance of Ember.Object' );
  ok( Ember.Object.detectInstance(b), 'b is an instance of Ember.Object' );
  ok( Ember.Object.detectInstance(c), 'c is an instance of Ember.Object' );

  ok( !A.detectInstance(o), 'o is not an instance of A');
  ok( A.detectInstance(a), 'a is an instance of A' );
  ok( A.detectInstance(b), 'b is an instance of A' );
  ok( A.detectInstance(c), 'c is an instance of A' );

  ok( !B.detectInstance(o), 'o is not an instance of B' );
  ok( !B.detectInstance(a), 'a is not an instance of B' );
  ok( B.detectInstance(b), 'b is an instance of B' );
  ok( !B.detectInstance(c), 'c is not an instance of B' );

  ok( !C.detectInstance(o), 'o is not an instance of C' );
  ok( !C.detectInstance(a), 'a is not an instance of C' );
  ok( !C.detectInstance(b), 'b is not an instance of C' );
  ok( C.detectInstance(c), 'c is an instance of C' );

});