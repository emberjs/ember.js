// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var store, child, Foo, json, foo ;
module("SC.Record#storeDidChangeProperties", {
  setup: function() {
    SC.RunLoop.begin();
    
    store = SC.Store.create();
    Foo = SC.Record.extend({
      
      // record diagnostic change
      statusCnt: 0,
      statusDidChange: function() {
        this.statusCnt++;
      }.observes('status'),
      
      fooCnt: 0,
      fooDidChange: function() {
        this.fooCnt++;
      }.observes('foo')
      
    });
    
    
    json = { 
      foo: "bar", 
      number: 123,
      bool: YES,
      array: [1,2,3] 
    };
    
    foo = store.createRecord(Foo, json);
    store.writeStatus(foo.storeKey, SC.Record.READY_CLEAN);
    
    SC.RunLoop.end();
  }
});

function checkPreconditions() {
  equals(foo.statusCnt, 0, 'precond - statusCnt');
  equals(foo.fooCnt, 0, 'precond - fooCnt');
}

function expect(fooObject, expectedStatusCnt, expectedFooCnt) {
  equals(fooObject.statusCnt, expectedStatusCnt, 'status should have changed');
  equals(fooObject.fooCnt, expectedFooCnt, 'foo should have changed');
}

// ..........................................................
// BASIC BEHAVIORS
// 

test("should change status only if statusOnly=YES", function() {
  checkPreconditions();
  foo.storeDidChangeProperties(YES);
  expect(foo,1,0);
});


test("should change attrs  & status if statusOnly=NO", function() {
  checkPreconditions();
  foo.storeDidChangeProperties(NO);
  expect(foo,1,1);
});

// ..........................................................
// VERIFY CALL SCENARIOS
// 

test("editing a clean record should change all", function() {
  checkPreconditions();
  
  SC.RunLoop.begin();
  foo.writeAttribute("foo", "baz"); // NB: Must be different from "foo"
  SC.RunLoop.end();
  
  expect(foo,2,1);
});

test("editing an attribute to same value should do nothing", function() {
  checkPreconditions();
  
  SC.RunLoop.begin();
  foo.writeAttribute("foo", "bar"); // NB: Must be "bar"
  SC.RunLoop.end();
  
  expect(foo,0,0);
});

test("destroying a record should change all", function() {
  checkPreconditions();
  SC.RunLoop.begin();
  foo.destroy();
  expect(foo,1,0); // calling destroy() should specifically change status
  SC.RunLoop.end();
  expect(foo,2,1);
});

test("refreshing a record should change status", function() {
  checkPreconditions();
  SC.RunLoop.begin();
  foo.refresh();
  SC.RunLoop.end();
  expect(foo,1,0);
});

test("committing attribute changes from nested store should change attrs", function() {
  checkPreconditions();
  
  SC.RunLoop.begin();
  var child = store.chain();
  var foo2 = child.materializeRecord(foo.storeKey);

  foo2.writeAttribute('foo', 'baz'); // must not be 'bar'
  SC.RunLoop.end();
  // no changes should happen yet on foo.
  expect(foo,0,0);
  
  SC.RunLoop.begin();
  // commit
  child.commitChanges();

  // now changes
  expect(foo,1,1);
});

test("changing attributes on a parent store should notify child store if inherited", function() {
  var child = store.chain();
  var oldfoo = foo;
  var parentfoo = store.materializeRecord(foo.storeKey);
  var childfoo = child.materializeRecord(foo.storeKey);
  equals(child.storeKeyEditState(foo.storeKey), SC.Store.INHERITED, 'precond - foo should be inherited from parent store');
  
  SC.RunLoop.begin();
  parentfoo.writeAttribute('foo', 'baz'); // must not be bar
  SC.RunLoop.end();
  
  expect(childfoo,1,1); // should reflect on child
});

test("changing attributes on a parent store should NOT notify child store if locked", function() {
  
  var child = store.chain();
  var oldfoo = foo;
  var parentfoo = store.materializeRecord(foo.storeKey);
  var childfoo = child.materializeRecord(foo.storeKey);
  childfoo.readAttribute('foo');
  equals(child.storeKeyEditState(foo.storeKey), SC.Store.EDITABLE, 'precond - foo should be locked from parent store');
   
  SC.RunLoop.begin();
  parentfoo.writeAttribute('foo', 'baz'); // must not be bar
  SC.RunLoop.end();
  expect(childfoo,0,0); // should not reflect on child
  expect(parentfoo,2,1);
  // discarding changes should update

  // NOTE: recourds should change immediately on commit/discard changes.
  // test results here BEFORE run loop ends
  SC.RunLoop.begin();
  child.discardChanges(); // make it match parent again
  expect(childfoo,1,1); //the childfoo record is reset to whatever the parentValue is.
  SC.RunLoop.end();

});

