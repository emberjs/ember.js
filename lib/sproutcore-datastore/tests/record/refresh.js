// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var MyFoo = null, callInfo ;
module("SC.Record#refresh", {
  setup: function() {
    SC.RunLoop.begin();
    MyApp = SC.Object.create({
      store: SC.Store.create()
    })  ;
  
    MyApp.Foo = SC.Record.extend();
    MyApp.json = { 
      foo: "bar", 
      number: 123,
      bool: YES,
      array: [1,2,3] 
    };
    
    MyApp.foo = MyApp.store.createRecord(MyApp.Foo, MyApp.json);
    
    // modify store so that everytime refreshRecords() is called it updates 
    // callInfo
    callInfo = null ;
    MyApp.store.refreshRecord = function(records) {
      callInfo = SC.A(arguments) ; // save method call
    };
  },
  
  teardown: function() {
    SC.RunLoop.end();
  }
  
});

test("calling refresh should call refreshRecord() on store", function() {
  MyApp.foo.refresh();
  same(callInfo, [null,null,MyApp.foo.storeKey,undefined], 'refreshRecord() should be called on parent');
});

test("should return receiver", function() {
  equals(MyApp.foo.refresh(), MyApp.foo, 'should return receiver');
});

