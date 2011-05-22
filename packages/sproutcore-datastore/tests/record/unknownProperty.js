// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

var MyFoo = null ;
module("SC.Record#unknownProperty", {
  setup: function() {
    SC.run.begin();
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
    
    MyApp.FooStrict = SC.Record.extend();
    MyApp.FooStrict.reopenClass({
      ignoreUnknownProperties: YES
    });
    
    MyApp.fooStrict = MyApp.store.createRecord(MyApp.FooStrict, MyApp.json);
    
  },
  
  teardown: function() {
    SC.run.end();
    window.MyApp = undefined;
  }
});

test("get() returns attributes with no type changes if they exist", function() {
  'foo number bool array'.w().forEach(function(key) {
    equals(get(MyApp.foo, key), MyApp.json[key], "get(MyApp.foo, %@) should === attribute".fmt(key));
  });
});

test("get() unknown attribute returns undefined", function() {
  equals(get(MyApp.foo, 'imaginary'), undefined, 'imaginary property should be undefined');
});

test("set() unknown property should add to dataHash", function() {
  set(MyApp.foo, 'blue', '0x00f');
  equals(MyApp.store.dataHashes[MyApp.foo.storeKey].blue, '0x00f', 'should add blue attribute');
});

test("set() should replace existing property", function() {
  set(MyApp.foo, 'foo', 'baz');
  equals(MyApp.store.dataHashes[MyApp.foo.storeKey].foo, 'baz', 'should update foo attribute');
});

test("set() on unknown property if model ignoreUnknownProperties=YES should not write it to data hash", function() {
  set(MyApp.fooStrict, 'foo', 'baz');
  equals(MyApp.store.dataHashes[MyApp.fooStrict.storeKey].foo, 'bar', 'should not have written new value to dataHash');
});


