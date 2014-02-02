// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same notest */

var source, indexes, observer, obj ; // base array to work with
module("SC.RangeObserver#update", {
  setup: function() {
    
    // create array with 5 SC.Object's in them
    source = [1,2,3,4,5].map(function(x) {
      return SC.Object.create({ item: x, foo: "bar" }) ;
    }, this); 

    indexes = SC.IndexSet.create(2,2); // select 2..3
    
    observer = SC.Object.create({
      
      callCount: 0, 
      
      rangeDidChange: function() { 
        this.callCount++;
      }
      
    });

    obj = SC.RangeObserver.create(source, indexes, observer, observer.rangeDidChange, "context", YES);
    
  }
});

test("returns receiver", function() {
  ok(obj === obj.update(source, SC.IndexSet.create()), 'should return receiver');
});

test("switches to observing new range - no previous updated", function() {
  obj.update(source, SC.IndexSet.create(0));
  observer.callCount = 0 ;
  
  var len = source.length, idx;
  for(idx=0;idx<len;idx++) source[idx].set('foo', 'baz');
  
  // since new index set length is different use this as a proxy to verify
  // that range changed
  equals(observer.callCount, 1, 'range observer should fire on new range');
});

test("switches to observing new range - previously updated", function() {
  var len = source.length, idx;
  for(idx=0;idx<len;idx++) source[idx].set('foo', 'baz');
  observer.callCount = 0 ;

  obj.update(source, SC.IndexSet.create(0));
  observer.callCount = 0 ;
  
  for(idx=0;idx<len;idx++) source[idx].set('foo', 'bar');
  
  // since new index set length is different use this as a proxy to verify
  // that range changed
  equals(observer.callCount, 1, 'range observer should fire on new range');
});

