// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same notest */

var source, indexes, observer, obj ; // base array to work with
module("SC.RangeObserver#rangeDidChange", {
  setup: function() {
    
    // create array with 5 SC.Object's in them
    source = [1,2,3,4,5].map(function(x) {
      return SC.Object.create({ item: x, foo: "bar" }) ;
    }, this); 

    indexes = SC.IndexSet.create(2,2); // select 2..3
    
    observer = SC.Object.create({

      verify: NO ,
      
      callCount: 0, 
      
      indexes: NO,
      
      // whenever this is called, verify proper params are passed
      changeObserver: function(inSource, inObject, inKey, inIndexes, inContext) { 
        this.callCount++;
        if (this.verify) {
          ok(source === inSource, 'source should match source array');
          ok(!inObject, 'object param should be null');
          equals(inKey, '[]', 'passed key should be brackets');
          if (this.indexes) {
            ok(this.indexes.isEqual(inIndexes), 'passed indexes should be %@.  actual: %@'.fmt(this.indexes, inIndexes));
          } else if (this.indexes === null) {
            equals(inIndexes, null, 'passed indexes should be null');
          }
          
          equals(inContext, 'context', 'should pass context');
        }
      }
      
    });

    obj = SC.RangeObserver.create(source, indexes, observer, observer.changeObserver, "context", YES);
    
  }
});

test("returns receiver", function() {
  ok(obj.rangeDidChange() === obj, 'should return receiver');
});

// ..........................................................
// CALLBACK
// 

test("invokes callback if no changes set is passed", function() {
  observer.verify = YES ;
  observer.indexes = null ;
  obj.rangeDidChange();
  equals(observer.callCount, 1, 'should invoke callback');
});

test("invokes callback if changes set is passed and it intersects with observed range", function() {
  observer.verify = YES ;
  observer.indexes = SC.IndexSet.create(1,2) ;
  obj.rangeDidChange(observer.indexes);
  equals(observer.callCount, 1, 'should invoke callback');
});

test("does NOT invoke callback if changes set is passed and it intersects with observed range", function() {
  obj.rangeDidChange(SC.IndexSet.create(4));
  equals(observer.callCount, 0, 'should NOT invoke callback');
});

// ..........................................................
// OBSERVER UPDATES
// 

test("if object in observed range changes, should stop observing old objects and start observing new objects - no previous changes", function() {
  
  var newObject = SC.Object.create({ item: 10, foo: "baz" });
  source[2] = newObject; // bypass KVO since we are testing it
  obj.rangeDidChange(SC.IndexSet.create(2));
  
  observer.callCount = 0 ;
  newObject.set('foo', 'bar');
  equals(observer.callCount, 1, 'should invoke observer when new object changes');
    
});

test("if object in observed range changes, should stop observing old objects and start observing new objects - previous changes", function() {
  
  source[2].set('foo', 'FOO2');
  equals(observer.callCount, 1, 'precond - should invoke observer on original object');
  
  var newObject = SC.Object.create({ item: 10, foo: "baz" });
  source[2] = newObject; // bypass KVO since we are testing it
  obj.rangeDidChange(SC.IndexSet.create(2));
  
  observer.callCount = 0 ;
  newObject.set('foo', 'bar');
  equals(observer.callCount, 1, 'should invoke observer when new object changes');
    
});


