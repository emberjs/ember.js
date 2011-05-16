// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var MyFoo = null ;
module("SC.Record#unknownProperty", {
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
    
    MyApp.FooStrict = SC.Record.extend();
    
    SC.mixin(MyApp.FooStrict, {
      ignoreUnknownProperties: YES
    });
    
    MyApp.fooStrict = MyApp.store.createRecord(MyApp.FooStrict, MyApp.json);
    
  },
  
  teardown: function() {
    SC.RunLoop.end();
  }
});

test("get() returns attributes with no type changes if they exist", function() {
  'foo number bool array'.w().forEach(function(key) {
    equals(MyApp.foo.get(key), MyApp.json[key], "MyApp.foo.get(%@) should === attribute".fmt(key));
  });
});

test("get() unknown attribute returns undefined", function() {
  equals(MyApp.foo.get('imaginary'), undefined, 'imaginary property should be undefined');
});

test("set() unknown property should add to dataHash", function() {
  MyApp.foo.set('blue', '0x00f');
  equals(MyApp.store.dataHashes[MyApp.foo.storeKey].blue, '0x00f', 'should add blue attribute');
});

test("set() should replace existing property", function() {
  MyApp.foo.set('foo', 'baz');
  equals(MyApp.store.dataHashes[MyApp.foo.storeKey].foo, 'baz', 'should update foo attribute');
});

test("set() on unknown property if model ignoreUnknownProperties=YES should not write it to data hash", function() {
  MyApp.fooStrict.set('foo', 'baz');
  equals(MyApp.store.dataHashes[MyApp.fooStrict.storeKey].foo, 'bar', 'should not have written new value to dataHash');
});


