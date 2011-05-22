// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

// test core array-mapping methods for RecordArray
var store, storeKey, json, rec, storeKeys, recs, query, recsController, fooQuery, fooRecs, fooRecsController;
SC.RecordArray.QUERY_MATCHING_THRESHOLD = Infinity;

module("SC.RecordArray core methods", {
  setup: function() {
    // setup dummy store
    store = SC.Store.create();

    storeKey = SC.Record.storeKeyFor('foo');
    json = {  guid: "foo", foo: "foo" };

    store.writeDataHash(storeKey, json, SC.Record.READY_CLEAN);


    // get record
    rec = store.materializeRecord(storeKey);
    equals(get(rec, 'foo'), 'foo', 'record should have json');

    // get record array.
    query = SC.Query.create({ recordType: SC.Record });
    recs = SC.RecordArray.create({ store: store, query: query });

    recsController = SC.Object.create({
      content: recs,
      bigCost: NO,
      veryExpensiveObserver: function() {
        set(this, 'bigCost', YES);
      }.observes('.content.[]')
    });

    fooQuery = SC.Query.create({ recordType: SC.Record, conditions: "foo='foo'" });
    fooRecs = SC.RecordArray.create({ store: store, query: fooQuery });

    fooRecsController = SC.Object.create({
      content: fooRecs,
      bigCost: NO,
      veryExpensiveObserver: function() {
        set(this, 'bigCost', YES);
      }.observes('.content.[]')
    });
  }
});

// ..........................................................
// BASIC TESTS
//

// test("should not initially populate storeKeys array until we flush()", function() {
// 
//   equals(get(recs, 'storeKeys'), null, 'should not have storeKeys yet');
// 
//   recs.flush();
// 
//   var storeKeys = get(recs, 'storeKeys');
//   same(storeKeys, [storeKey], 'after flush should have initial set of storeKeys');
// 
// });
// 
// test("length property should flush", function() {
//   equals(get(recs, 'storeKeys'), null,' should not have storeKeys yet');
//   equals(get(recs, 'length'), 1, 'should have length 1 when called');
//   same(get(recs, 'storeKeys'), [storeKey], 'after flush should have initial set of storeKeys');
// });
// 
// test("objectAt() should flush", function() {
//   equals(get(recs, 'storeKeys'), null,' should not have storeKeys yet');
//   equals(recs.objectAt(0), rec, 'objectAt(0) should return record');
//   same(get(recs, 'storeKeys'), [storeKey], 'after flush should have initial set of storeKeys');
// });
// 

// ..........................................................
// storeDidChangeStoreKeys()
//

test("calling storeDidChangeStoreKeys() with a matching recordType", function() {
  recs.flush(); // do initial setup
  var orig = get(recs, 'storeKeys').copy();

  // do it this way instead of using store.createRecord() to isolate the
  // method call.
  storeKey = SC.Record.storeKeyFor("bar");
  json     = {  guid: "bar", foo: "bar" };
  store.writeDataHash(storeKey, json, SC.Record.READY_CLEAN);

  equals(get(recs, 'needsFlush'), NO, 'PRECOND - should not need flush');
  same(get(recs, 'storeKeys'), orig, 'PRECOND - storeKeys should not have changed yet');

  recs.storeDidChangeStoreKeys([storeKey], SC.Set.create().add(SC.Record));

  orig.unshift(storeKey); // update - must be first b/c id.bar < id.foo
  equals(get(recs, 'needsFlush'), NO, 'should not need flush anymore');
  same(get(recs, 'storeKeys'), orig, 'storeKeys should now be updated - rec1[%@]{%@} = %@, rec2[%@]{%@} = %@'.fmt(
    get(rec, 'id'), get(rec, 'storeKey'), rec,

    get(store.materializeRecord(storeKey), 'id'),
    storeKey,
    store.materializeRecord(storeKey)));

});

// test("calling storeDidChangeStoreKeys() with a non-matching recordType", function() {
// 
//   var Foo = SC.Record.extend(),
//       Bar = SC.Record.extend();
// 
//   storeKey = Foo.storeKeyFor('foo2');
//   json = { guid: "foo2" };
// 
//   store.writeDataHash(storeKey, json, SC.Record.READY_CLEAN);
// 
//   query = SC.Query.create({ recordType: Foo });
//   recs = SC.RecordArray.create({ store: store, query: query });
// 
//   equals(get(recs, 'length'), 1, 'should have a Foo record');
// 
//   // now simulate adding a Bar record
//   storeKey = Bar.storeKeyFor('bar');
//   json = { guid: "bar" };
//   store.writeDataHash(storeKey, json, SC.Record.READY_CLEAN);
// 
//   recs.storeDidChangeStoreKeys([storeKey], SC.Set.create().add(Bar));
//   equals(get(recs, 'needsFlush'), NO, 'should not have indicated it needed a flush');
// 
// });
// 
// test("calling storeDidChangeStoreKeys() to remove a record", function() {
// 
//   equals(get(recs, 'length'), 1, 'PRECOND - should have storeKey');
// 
//   store.writeStatus(storeKey, SC.Record.DESTROYED_CLEAN);
//   equals(get(recs, 'storeKeys').length, 1, 'should still have storeKey');
//   recs.storeDidChangeStoreKeys([storeKey], SC.Set.create().add(SC.Record));
// 
//   equals(get(recs, 'length'), 0, 'should remove storeKey on flush()');
// });
// 
// test("calling storeDidChangeStoreKeys() with a matching recordType should not unnecessarily call enumerableContentDidChange", function() {
//   // do initial setup
//   recs.flush();
//   fooRecs.flush();
// 
//   set(recsController, 'bigCost', NO);
//   set(fooRecsController, 'bigCost', NO);
// 
//   // do it this way instead of using store.createRecord() to isolate the
//   // method call.
//   storeKey = SC.Record.storeKeyFor("bar");
//   json     = {  guid: "bar", foo: "bar" };
//   store.writeDataHash(storeKey, json, SC.Record.READY_CLEAN);
// 
//   equals(get(recsController, 'bigCost'), NO, 'PRECOND - recsController should not have spent big cost');
//   equals(get(fooRecsController, 'bigCost'), NO, 'PRECOND - fooRecsController should not have spent big cost');
// 
//   recs.storeDidChangeStoreKeys([storeKey], SC.Set.create().add(SC.Record));
//   fooRecs.storeDidChangeStoreKeys([storeKey], SC.Set.create().add(SC.Record));
// 
//   equals(get(recsController, 'bigCost'), YES, 'recsController should have spent big cost');
//   equals(get(fooRecsController, 'bigCost'), NO, 'fooRecsController should not have spent big cost');
// });
// 
// test("adding an array observer to a SC.RecordArray should cause the array to flush", function() {
//   var callCount = 0;
// 
//   recs.addArrayObserver(this, {
//     didChange: function() {
//       callCount++;
//     },
// 
//     willChange: function() { }
//   });
// 
//   get(recs, 'length');
// 
//   equals(callCount, 0, "does not cause array observers to be fired when getting length");
// });
// 
// 
// // ..........................................................
// // SPECIAL CASES
// //
// 
// var json2, foo, bar ;
// 
// module("SC.RecordArray core methods", {
//   setup: function() {
//     // setup dummy store
//     store = SC.Store.create();
// 
//     storeKey = SC.Record.storeKeyFor('foo');
//     json = {  guid: "foo", name: "foo" };
//     store.writeDataHash(storeKey, json, SC.Record.READY_CLEAN);
//     foo = store.materializeRecord(storeKey);
//     equals(get(foo, 'name'), 'foo', 'record should have json');
// 
//     storeKey = SC.Record.storeKeyFor('bar');
//     json2 = { guid: "bar", name: "bar" };
//     store.writeDataHash(storeKey, json2, SC.Record.READY_CLEAN);
//     bar = store.materializeRecord(storeKey);
//     equals(get(bar, 'name'), 'bar', 'record should have json');
// 
//     // get record array.
//     query = SC.Query.create({ recordType: SC.Record, orderBy: 'name' });
//     recs = store.find(query);
//   }
// });
// 
// test("local query should notify changes", function() {
//   // note: important to retrieve records from RecordArray first to prime
//   // any cache
//   same(recs.mapProperty('id'), ['bar', 'foo'], 'PRECOND - bar should appear before foo');
// 
//   SC.stopIt = YES;
// 
//   SC.run.begin();
//   set(bar, 'name', 'zzbar');
//   SC.run.end(); // should resort record array
// 
//   same(recs.mapProperty('id'), ['foo', 'bar'], 'order of records should change');
// });
// 


