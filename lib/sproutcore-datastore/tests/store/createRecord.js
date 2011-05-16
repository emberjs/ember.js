// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var store, storeKey, json, hash, hash2;

module("SC.Store#createRecord", {
  setup: function() {
    
    MyRecordType = SC.Record.extend({
      string: SC.Record.attr(String, { defaultValue: "Untitled" }),
      number: SC.Record.attr(Number, { defaultValue: 5 }),
      bool: SC.Record.attr(Boolean, { defaultValue: YES })
    });

    SC.RunLoop.begin();

    store = SC.Store.create();
    
    json = {
      string: "string",
      number: 23,
      bool:   YES
    };
    
    storeKey = SC.Store.generateStoreKey();

    store.writeDataHash(storeKey, json, SC.Record.READY_CLEAN);

    SC.RunLoop.end();
  }
});

test("create a record", function() {
  var sk;
  var rec = SC.Record.create();
  hash = {
    guid: "1234abcd",
    string: "abcd",
    number: 1,
    bool:   NO
    };
  hash2 = {
    string: "abcd",
    number: 1,
    bool:   NO
  };

  rec = store.createRecord(SC.Record, hash);
  ok(rec, "a record was created");
  sk=store.storeKeyFor(SC.Record, rec.id());
  equals(store.readDataHash(sk), hash, "data hashes are equivalent");
  equals(rec.id(), "1234abcd", "guids are the same");

  rec = store.createRecord(SC.Record, hash2, "priKey");
  ok(rec, "a record with a custom id was created");
  sk=store.storeKeyFor(SC.Record, "priKey");
  equals(store.readDataHash(sk), hash2, "data hashes are equivalent");
  equals(rec.id(), "priKey", "guids are the same");
  
  equals(store.changelog.length, 2, "The changelog has the following number of entries:");
  
  
});

test("Creating an empty (null) record should make the hash available", function() {
  
  store.createRecord(MyRecordType, null, 'guid8');
  var storeKey = store.storeKeyFor(MyRecordType, 'guid8');
  
  ok(store.readDataHash(storeKey), 'data hash should not be empty/undefined');
  
});
