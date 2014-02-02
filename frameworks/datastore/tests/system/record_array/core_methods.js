// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

// test core array-mapping methods for RecordArray
var store, storeKey, json, rec, storeKey2, json2, rec2, storeKeys, recs;
module("SC.RecordArray core methods", {
  setup: function() {
    // setup dummy store
    store = SC.Store.create();

    storeKey = SC.Record.storeKeyFor('foo');
    json = { guid: "foo", foo: "bar" };
    store.writeDataHash(storeKey, json, SC.Record.READY_CLEAN);

    storeKey2 = SC.Record.storeKeyFor('baz');
    json2 = { guid: "baz", baz: "bash" };
    store.writeDataHash(storeKey2, json2, SC.Record.READY_CLEAN);

    // get records
    rec = store.materializeRecord(storeKey);
    equals(rec.get('foo'), 'bar', 'precond - record should have json');
    rec2 = store.materializeRecord(storeKey2);
    equals(rec2.get('baz'), 'bash', 'precond - record 2 should have json');

    // get record array.
    storeKeys = [storeKey, storeKey2];
    recs = SC.RecordArray.create({ store: store, storeKeys: storeKeys });
  }
});

test("initial status", function() {
  equals(recs.get('status'), SC.Record.EMPTY, 'status should be SC.Record.EMPTY');
});

// ..........................................................
// LENGTH
//

test("should pass through length", function() {
  equals(recs.get('length'), storeKeys.length, 'rec should pass through length');
});

test("changing storeKeys length should change length of rec array also", function() {

  var oldlen = recs.get('length');

  storeKeys.pushObject(SC.Store.generateStoreKey()); // change length

  ok(storeKeys.length > oldlen, 'precond - storeKeys.length should have changed');
  equals(recs.get('length'), storeKeys.length, 'rec should pass through length');
});

// ..........................................................
// objectAt
//

test("should materialize record for object", function() {
  equals(storeKeys[0], storeKey, 'precond - storeKeys[0] should be storeKey');
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should materialize record');
});

test("reading past end of array length should return undefined", function() {
  equals(recs.objectAt(2000), undefined, 'recs.objectAt(2000) should be undefined');
});

test("modifying the underlying storeKey should change the returned materialized record", function() {
  // read record once to make it materialized
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should materialize record');

  // create a new record.
  SC.RunLoop.begin();
  var rec3 = store.createRecord(SC.Record, { foo: "rec3" });
  SC.RunLoop.end();

  var storeKey3 = rec3.get('storeKey');

  // add to beginning of storeKey array
  storeKeys.unshiftObject(storeKey3);
  equals(recs.get('length'), 3, 'should now have length of 3');
  equals(recs.objectAt(0), rec3, 'objectAt(0) should return new record');
  equals(recs.objectAt(1), rec, 'objectAt(1) should return old record 1');
  equals(recs.objectAt(2), rec2, 'objectAt(2) should return old record 2');
});

test("reading a record not loaded in store should trigger retrieveRecord", function() {
  var callCount = 0;

  // patch up store to record a call and to make it look like data is not
  // loaded.
  store.removeDataHash(storeKey, SC.Record.EMPTY);
  store.retrieveRecord = function() { callCount++; };

  equals(store.peekStatus(storeKeys.objectAt(0)), SC.Record.EMPTY, 'precond - storeKey must not be loaded');

  var rec = recs.objectAt(0);
  equals(callCount, 1, 'store.retrieveRecord() should have been called');
});

// ..........................................................
// replace()
//

test("adding a record to the record array should pass through storeKeys", function() {
  // read record once to make it materialized
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should materialize record');

  // create a new record.
  SC.RunLoop.begin();
  var rec3 = store.createRecord(SC.Record, { foo: "rec3" });
  SC.RunLoop.end();

  var storeKey3 = rec3.get('storeKey');

  // add record to beginning of record array
  recs.unshiftObject(rec3);

  // verify record array
  equals(recs.get('length'), 3, 'should now have length of 3');
  equals(recs.objectAt(0), rec3, 'recs.objectAt(0) should return new record');
  equals(recs.objectAt(1), rec, 'recs.objectAt(1) should return old record 1');
  equals(recs.objectAt(2), rec2, 'recs.objectAt(2) should return old record 2');

  // verify storeKeys
  equals(storeKeys.objectAt(0), storeKey3, 'storeKeys[0] should return new storeKey');
  equals(storeKeys.objectAt(1), storeKey, 'storeKeys[1] should return old storeKey 1');
  equals(storeKeys.objectAt(2), storeKey2, 'storeKeys[2] should return old storeKey 2');
});

// ..........................................................
// Property Observing
//

test("changing the underlying storeKeys should notify observers of records", function() {

  // setup observer
  var obj = SC.Object.create({
    cnt: 0,
    observer: function() { this.cnt++; }
  });
  recs.addObserver('[]', obj, obj.observer);

  // now modify storeKeys
  storeKeys.pushObject(SC.Store.generateStoreKey());
  equals(obj.cnt, 1, 'observer should have fired after changing storeKeys');
});

test("swapping storeKey array should change recordArray and observers", function() {

  // setup alternate storeKeys
  SC.RunLoop.begin();
  var rec2 = store.createRecord(SC.Record, { foo: "rec2" });
  SC.RunLoop.end();

  var storeKey2 = rec2.get('storeKey');
  var storeKeys2 = [storeKey2];

  // setup observer
  var obj = SC.Object.create({
    cnt: 0,
    observer: function() { this.cnt++; }
  });
  recs.addObserver('[]', obj, obj.observer);

  // read record once to make it materialized
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should materialize record');

  // now swap storeKeys
  obj.cnt = 0 ;
  recs.set('storeKeys', storeKeys2);

  // verify observer fired and record changed
  equals(obj.cnt, 1, 'observer should have fired after swap');
  equals(recs.objectAt(0), rec2, 'recs.objectAt(0) should return new rec');

  // modify storeKey2, make sure observer fires and content changes
  obj.cnt = 0;
  storeKeys2.unshiftObject(storeKey);
  equals(obj.cnt, 1, 'observer should have fired after edit');
  equals(recs.get('length'), 2, 'should reflect new length');
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should return pushed rec');

});

test("find works with query", function(){
  var filtered = recs.find(SC.Query.create({ conditions: "foo = 'bar'" }));

  equals(filtered.get('length'), 1);
  equals(filtered.objectAt(0), rec);
});

test("find works as enumerable", function(){
  var filtered = recs.find(function(r){ return r.get('foo') === 'bar'; });
  equals(filtered, rec);
});
