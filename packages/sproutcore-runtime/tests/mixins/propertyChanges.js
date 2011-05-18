// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
var ObjectA;
module("object.propertyChanges()", {	
	setup: function() {
		ObjectA = SC.Object.create({
			normal: 'value',
			normal1: 'zeroValue',
						
			action: function() {
				this.normal1= 'newValue';
			}.observes('normal'),
			
			normal2: 'dependentValue',
			normal3: 'notifiedValue',
			
			notifyAction: function() {
				this.normal3= 'newDependentValue';
			}.observes('normal2'),
			
			notifyAllAction: function() {
				this.normal2= 'newZeroValue';
			}.observes('normal1')			
		});
  }
});

// CAJ: These tests are OK but the purpose of begin/end property changes is
// to suspend notifications.  you should do something like:
/*
  obj.beginPropertyChanges()
  obj.set('foo', 'bar');
  -- verify that observer for 'foo' did not fire
  obj.endPropertyChanges()
  -- verify that observer for 'foo' did fire
*/
// also, we need some tests verifying that begin/end property changes can
// be nested.  When they are nested, observers should not fire until you 
// unnest them.  i.e.  
/*
  obj.beginPropertyChanges()
    obj.beginPropertyChanges() // nested!
      obj.set('foo', 'bar')
    obj.endPropertyChanges(); // nested - do not fire.
  obj.endProeprtyChanges()
  -- observers fire here!
*/
//
test("should increment the indicator before begining the changes to the object", function() {
    equals(ObjectA.beginPropertyChanges()._kvo_changeLevel, 1) ;
});

test("should decrement the indicator after ending the changes to the object", function() {
    equals(ObjectA.endPropertyChanges()._kvo_changeLevel, 0) ;
});

// CAJ: This test works but its confusing.  the relationship between 'normal' 
// and 'normal1' is really unclear.  Rename these properties
// to something more descriptive and add comments to this test explaining 
// what you expect to have happen.  You should always comment in the test 
// anytime you expect something to happen in the background (such as expecting
// an observer to fire.) 
test("should indicate that the property of an object has just changed", function() {
	equals(ObjectA.propertyWillChange('normal'),ObjectA) ;
	ObjectA.normal = 'newValue';
	equals(ObjectA.propertyDidChange('normal', null),ObjectA) ;
	equals(ObjectA.normal1,'newValue') ;
});

// CAJ:  See my comment from above.  It's not clear how this test works.  
// Consider using different property names and add a comment inline to 
// explain that you expect an observer to fire.
test("should notify that the property of an object has changed", function() {
	ObjectA.notifyPropertyChange('normal2','value');
	equals(ObjectA.normal3,'newDependentValue') ;
});

// CAJ:  Same comment here as the previous two tests.
test("should notify all observers that their property might have changed", function() {
	ObjectA.allPropertiesDidChange();
	equals(ObjectA.normal2,'newZeroValue') ;
});

