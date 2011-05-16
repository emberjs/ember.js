// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var store, Foo, json, foo ;
module("SC.Record#writeAttribute", {
  setup: function() {
    SC.RunLoop.begin();
    store = SC.Store.create();
    Foo = SC.Record.extend();
    json = { 
      foo: "bar", 
      number: 123,
      bool: YES,
      array: [1,2,3],
      guid: 1
    };
    
    foo = store.createRecord(Foo, json);
    store.writeStatus(foo.storeKey, SC.Record.READY_CLEAN);
    SC.RunLoop.end();
  }
});

test("returns receiver", function() {
  equals(foo.writeAttribute("bar", "baz"), foo, 'should return receiver');
});

test("first time writing should mark record as dirty", function() {
  // precondition
  equals(foo.get('status'), SC.Record.READY_CLEAN, 'precond - start clean');

  SC.RunLoop.begin();
  // action
  foo.writeAttribute("bar", "baz");
  SC.RunLoop.end();
  
  // evaluate
  equals(foo.get('status'), SC.Record.READY_DIRTY, 'should make READY_DIRTY after write');
});

test("state change should be deferred if writing inside of a beginEditing()/endEditing() pair", function() {

  // precondition
  equals(foo.get('status'), SC.Record.READY_CLEAN, 'precond - start clean');

  SC.RunLoop.begin();
  // action
  foo.beginEditing();
  
  foo.writeAttribute("bar", "baz");
  
  equals(foo.get('status'), SC.Record.READY_CLEAN, 'should not change state yet');

  foo.endEditing();
  
  SC.RunLoop.end();
  
  // evaluate
  equals(foo.get('status'), SC.Record.READY_DIRTY, 'should make READY_DIRTY after write');
  
}) ;

test("raises exception if you try to write an attribute before an attribute hash has been set", function() {
  store.removeDataHash(foo.storeKey);
  equals(store.readDataHash(foo.storeKey), null, 'precond - should not have store key');
  
  var cnt=0 ;
  try {
    foo.writeAttribute("foo", "bar");
  } catch(e) {
    equals(e, SC.Record.BAD_STATE_ERROR, 'should throw BAD_STATE_ERROR');
    cnt++;
  }
  equals(cnt, 1, 'should raise exception');
});


test("Writing to an attribute in chained store sets correct status", function() {
  
  var chainedStore = store.chain() ;
  
  var chainedRecord = chainedStore.find(Foo, foo.get('id'));
  equals(chainedRecord.get('status'), SC.Record.READY_CLEAN, 'precon - status should be READY_CLEAN');
  
  SC.RunLoop.begin();
  chainedRecord.writeAttribute('foo', 'newValue');
  SC.RunLoop.end();
  //chainedRecord.set('foo', 'newValue');
  
  equals(chainedRecord.get('status'), SC.Record.READY_DIRTY, 'status should be READY_DIRTY');
  
});


test("Writing a new guid", function(){
  equals(foo.get('id'), 1, 'foo.id should be 1');
  foo.set('guid', 2);
  equals(foo.get('id'), 2, 'foo.id should be 2');
});

test("Writing primaryKey of 'id'", function(){
  PrimaryKeyId = SC.Record.extend({ primaryKey: 'id' });
  var foo2 = store.createRecord(PrimaryKeyId, { id: 1 });

  equals(foo2.get('id'), 1, 'foo2.id should be 1');
  foo2.set('id', 2);
  equals(foo2.get('id'), 2, 'foo2.id should be 2');
});
