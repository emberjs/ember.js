// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.
  
  CHANGES FROM 1.6:

  * Create ObservableObject which includes Ember.Observable
  * Remove test that tests internal _kvo_changeLevel property.  This is an
    implementation detail.
  * Remove test for allPropertiesDidChange
  * Removed star observer test.  no longer supported
  * Removed property revision test.  no longer supported
*/

// ========================================================================
// Ember.Observable Tests
// ========================================================================
/*globals module test ok isObj equals expects */

var ObservableObject = Ember.Object.extend(Ember.Observable);

var revMatches = NO , ObjectA;

module("object.propertyChanges", {  
  setup: function() {
    ObjectA = ObservableObject.create({
      foo  : 'fooValue',
      prop : 'propValue',
            
      action: Ember.observer(function() {
        this.set('prop', 'changedPropValue');
      }, 'foo'),
      
      newFoo : 'newFooValue',
      newProp: 'newPropValue',
      
      notifyAction: Ember.observer(function() {
        this.set('newProp', 'changedNewPropValue');
      }, 'newFoo'),
      
      notifyAllAction: Ember.observer(function() {
        this.set('newFoo', 'changedNewFooValue');
      }, 'prop'),

      starProp: null,
      starObserver: function(target, key, value, rev) {
        revMatches = (rev === target.propertyRevision) ;
        this.starProp = key;
      }
      
    });
    }
});


test("should observe the changes within the nested begin / end property changes", function() {
    
  //start the outer nest
  ObjectA.beginPropertyChanges();
    // Inner nest
    ObjectA.beginPropertyChanges();
        ObjectA.set('foo', 'changeFooValue');
      equals(ObjectA.prop, "propValue") ;
      ObjectA.endPropertyChanges();
    
    //end inner nest
    ObjectA.set('prop', 'changePropValue');
    equals(ObjectA.newFoo, "newFooValue") ;
  //close the outer nest
  ObjectA.endPropertyChanges();
  
  equals(ObjectA.prop, "changedPropValue") ;
  equals(ObjectA.newFoo, "changedNewFooValue") ;
  
});

test("should observe the changes within the begin and end property changes", function() {
    
  ObjectA.beginPropertyChanges();
    ObjectA.set('foo', 'changeFooValue');
    
  equals(ObjectA.prop, "propValue") ;
    ObjectA.endPropertyChanges();
    
  equals(ObjectA.prop, "changedPropValue") ;
});

test("should indicate that the property of an object has just changed", function() {
  // inidicate that proprty of foo will change to its subscribers
  ObjectA.propertyWillChange('foo') ;
  
  //Value of the prop is unchanged yet as this will be changed when foo changes
  equals(ObjectA.prop, 'propValue' ) ;
  
  //change the value of foo.
  ObjectA.set('foo', 'changeFooValue');
  
  // Indicate the subscribers of foo that the value has just changed
  ObjectA.propertyDidChange('foo', null) ;
  
  // Values of prop has just changed
  equals(ObjectA.prop,'changedPropValue') ;
});

test("should notify that the property of an object has changed", function() {
  // Notify to its subscriber that the values of 'newFoo' will be changed. In this
  // case the observer is "newProp". Therefore this will call the notifyAction function
  // and value of "newProp" will be changed.
  ObjectA.notifyPropertyChange('newFoo','fooValue');
  
  //value of newProp changed.
  equals(ObjectA.newProp,'changedNewPropValue') ;
});

test("should invalidate function property cache when notifyPropertyChange is called", function() {
  
  var a = ObservableObject.create({
    _b: null,
    b: Ember.computed(function(key, value) {
      if (value !== undefined) {
        this._b = value;
        return this;
      }
      return this._b;
    })
  });
  
  a.set('b', 'foo');
  equals(a.get('b'), 'foo', 'should have set the correct value for property b');
  
  a._b = 'bar';
  a.notifyPropertyChange('b');
  a.set('b', 'foo');
  equals(a.get('b'), 'foo', 'should have invalidated the cache so that the newly set value is actually set');
  
});
