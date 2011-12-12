// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// Ember.keys Tests
// ========================================================================
/*globals module test */

module("Fetch Keys ");

test("should get a key array for a specified object ",function(){
	var object1 = {};

	object1.names = "Rahul";
	object1.age = "23";
	object1.place = "Mangalore";

	var object2 = [];
	object2 = Ember.keys(object1);
	same(object2,['names','age','place']);
});


