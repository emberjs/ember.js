// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/object/detect');

test('detect detects classes correctly', function() {

  var A = Ember.Object.extend();
  var B = A.extend();
  var C = A.extend();

  ok( Ember.Object.detect(Ember.Object), 'Ember.Object is an Ember.Object class' );
  ok( Ember.Object.detect(A), 'A is an Ember.Object class' );
  ok( Ember.Object.detect(B), 'B is an Ember.Object class' );
  ok( Ember.Object.detect(C), 'C is an Ember.Object class' );

  ok( !A.detect(Ember.Object), 'Ember.Object is not an A class' );
  ok( A.detect(A), 'A is an A class' );
  ok( A.detect(B), 'B is an A class' );
  ok( A.detect(C), 'C is an A class' );

  ok( !B.detect(Ember.Object), 'Ember.Object is not a B class' );
  ok( !B.detect(A), 'A is not a B class' );
  ok( B.detect(B), 'B is a B class' );
  ok( !B.detect(C), 'C is not a B class' );

  ok( !C.detect(Ember.Object), 'Ember.Object is not a C class' );
  ok( !C.detect(A), 'A is not a C class' );
  ok( !C.detect(B), 'B is not a C class' );
  ok( C.detect(C), 'C is a C class' );

});