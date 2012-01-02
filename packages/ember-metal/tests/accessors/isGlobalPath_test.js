// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.isGlobalPath');

test("global path's are recognized", function(){
  ok( Ember.isGlobalPath('App.myProperty') );
  ok( Ember.isGlobalPath('App.myProperty.subProperty') );
});

test("if there is a 'this' in the path, it's not a global path", function(){
  ok( !Ember.isGlobalPath('this.myProperty') );
  ok( !Ember.isGlobalPath('this') );
});

test("if the path starts with a lowercase character, it is not a global path", function(){
  ok( !Ember.isGlobalPath('myObj') );
  ok( !Ember.isGlobalPath('myObj.SecondProperty') );
});