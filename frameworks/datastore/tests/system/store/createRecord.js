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
      bool: SC.Record.attr(Boolean, { defaultValue: YES }),
      array: SC.Record.attr(Array, { defaultValue: [1, 2] }),
      funcDef: SC.Record.attr(Array, { defaultValue: function() { return [1, 3]} }),
      noDefault: SC.Record.attr(String)
    });

    MyKeyedRecordType = SC.Record.extend({
      string: SC.Record.attr(String, { defaultValue: "Untitled", key: 'string_key' }),
      number: SC.Record.attr(Number, { defaultValue: 5, key: 'number_key' }),
      bool: SC.Record.attr(Boolean, { defaultValue: YES, key: 'bool_key' }),
      array: SC.Record.attr(Array, { defaultValue: [1, 2], key: 'array_key' }),
      funcDef: SC.Record.attr(Array, { defaultValue: function() { return [1, 3]}, key: 'funcDef_key' }),
      noDefault: SC.Record.attr(String, { key: 'noDefault_key' })
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
    bool:   NO,
    array:  [],
    funcDef: [1, 2]
    };
  hash2 = {
    string: "abcd",
    number: 1,
    bool:   NO,
    array:  [],
    funcDef: [1, 2]
  };

  rec = store.createRecord(SC.Record, hash);
  ok(rec, "a record was created");
  sk=store.storeKeyFor(SC.Record, rec.get('id'));
  equals(store.readDataHash(sk), hash, "data hashes are equivalent");
  equals(rec.get('id'), "1234abcd", "guids are the same");

  rec = store.createRecord(SC.Record, hash2, "priKey");
  ok(rec, "a record with a custom id was created");
  sk=store.storeKeyFor(SC.Record, "priKey");
  equals(store.readDataHash(sk), hash2, "data hashes are equivalent");
  equals(rec.get('id'), "priKey", "guids are the same");

  equals(store.changelog.length, 2, "The changelog has the following number of entries:");
});

/**
  There is new functionality in the store that allows the developer to reference
  attribute names or attribute keys when creating a new record.

  For example, if the Record is defined as:

    MyApp.Record = SC.Record.extend({
      attrA: SC.RecordAttribute(String, { key: 'attr_a' });
    })

  Previously, passing the hash { attrA: 'test' } would see `attrA` added to the
  hash when it should instead be `attr_a`.  The new functionality, recognizes
  that the attribute key should be used.

  Therefore, either of these will result in the same data hash in the store:

    MyApp.store.createRecord(MyApp.Record, { attrA: 'test' })
    MyApp.store.createRecord(MyApp.Record, { attr_a: 'test' })

*/
test("Creating a keyed record", function() {
  var hash1, hash2, hash3, hash4, expectedHash, sk;

  // The actual hash that should be created.
  expectedHash = {
    string_key: "abcd",
    number_key: 1,
    bool_key:   NO,
    array_key:  [],
    funcDef_key: [1, 2]
  };

  // Uses only the attribute names
  hash1 = {
    string: "abcd",
    number: 1,
    bool:   NO,
    array:  [],
    funcDef: [1, 2]
  };

  // Uses only the attribute keys
  hash2 = {
    string_key: "abcd",
    number_key: 1,
    bool_key:   NO,
    array_key:  [],
    funcDef_key: [1, 2]
  };

  // Uses a mix of attribute names and keys
  hash3 = {
    string: "abcd",
    number_key: 1,
    bool_key:   NO,
    array:  [],
    funcDef: [1, 2]
  };

  // Uses duplicate attribute names and keys in different orders
  hash4 = {
    string: "efgh",
    string_key: "abcd",
    number_key: 1,
    bool_key:   NO,
    bool:   YES,
    array_key:  [],
    array:  ['a'],
    funcDef: [1, 2]
  };

  rec = store.createRecord(MyKeyedRecordType, hash1, 'test1');
  sk = store.storeKeyFor(MyKeyedRecordType, rec.get('id'));
  same(store.readDataHash(sk), expectedHash, "data hashes are equivalent when given only names");

  rec = store.createRecord(MyKeyedRecordType, hash2, 'test2');
  sk = store.storeKeyFor(MyKeyedRecordType, rec.get('id'));
  same(store.readDataHash(sk), expectedHash, "data hashes are equivalent when given only keys");

  rec = store.createRecord(MyKeyedRecordType, hash3, 'test3');
  sk = store.storeKeyFor(MyKeyedRecordType, rec.get('id'));
  same(store.readDataHash(sk), expectedHash, "data hashes are equivalent when given names and keys");

  rec = store.createRecord(MyKeyedRecordType, hash4, 'test4');
  sk = store.storeKeyFor(MyKeyedRecordType, rec.get('id'));
  same(store.readDataHash(sk), expectedHash, "data hashes are equivalent when given names and keys with conflicts");
});

test("Creating an empty (null) record should make the hash available", function() {

  store.createRecord(MyRecordType, null, 'guid8');
  var storeKey = store.storeKeyFor(MyRecordType, 'guid8');

  ok(store.readDataHash(storeKey), 'data hash should not be empty/undefined');

});

test("Initializing default values", function() {
  var rec1, rec2, sk1, sk2;

  //create 2 records
  rec1 = store.createRecord(MyRecordType, null, 'test1');
  rec2 = store.createRecord(MyRecordType, null, 'test2');

  //get storKeys
  sk1 = store.storeKeyFor(MyRecordType, rec1.get('id'));
  sk2 = store.storeKeyFor(MyRecordType, rec2.get('id'));

  ok(sk1, "a first record with default values was created");

  equals(store.readDataHash(sk1)['string'], "Untitled", "the default value for 'string' was initialized");
  equals(store.readDataHash(sk1)['number'], 5, "the default value for 'number' was initialized");
  equals(store.readDataHash(sk1)['bool'], YES, "the default value for 'bool' was initialized");
  same(store.readDataHash(sk1)['array'], [1, 2], "the default value for 'array' was initialized");
  same(store.readDataHash(sk1)['funcDef'], [1, 3], "the default value for 'funcDef' was initialized");
  equals(store.readDataHash(sk1)['noDefault'], null, "no value for 'noDefault' was initialized");

  ok(sk2, "a second record with default values was created");

  rec2.get('array').push(3);
  rec2.get('funcDef').push(2);

  same(store.readDataHash(sk2)['array'], [1, 2, 3], "the array for 'array' was updated");
  same(store.readDataHash(sk2)['funcDef'], [1, 3, 2], "the array for 'funcDef' was updated");

  ok(store.readDataHash(sk2)['array'] !== store.readDataHash(sk1)['array'], "the default value for 'array' is a copy not a reference");
  ok(store.readDataHash(sk2)['funcDef'] !== store.readDataHash(sk1)['funcDef'], "the default value for 'funcDef' is a copy not a reference");
});

test("Initializing default values with keyed attributes", function() {
  var rec1, rec2, sk1, sk2;

  //create 2 records
  rec1 = store.createRecord(MyKeyedRecordType, null, 'test1');
  rec2 = store.createRecord(MyKeyedRecordType, null, 'test2');

  //get storKeys
  sk1 = store.storeKeyFor(MyKeyedRecordType, rec1.get('id'));
  sk2 = store.storeKeyFor(MyKeyedRecordType, rec2.get('id'));

  ok(sk1, "a first record with default values was created");

  equals(store.readDataHash(sk1)['string_key'], "Untitled", "the default value for 'string' was initialized");
  equals(store.readDataHash(sk1)['number_key'], 5, "the default value for 'number' was initialized");
  equals(store.readDataHash(sk1)['bool_key'], YES, "the default value for 'bool' was initialized");
  same(store.readDataHash(sk1)['array_key'], [1, 2], "the default value for 'array' was initialized");
  same(store.readDataHash(sk1)['funcDef_key'], [1, 3], "the default value for 'funcDef' was initialized");
  equals(store.readDataHash(sk1)['noDefault_key'], null, "no value for 'noDefault' was initialized");

  ok(sk2, "a second record with default values was created");

  rec2.get('array').push(3);
  rec2.get('funcDef').push(2);

  same(store.readDataHash(sk2)['array_key'], [1, 2, 3], "the array for 'array' was updated");
  same(store.readDataHash(sk2)['funcDef_key'], [1, 3, 2], "the array for 'funcDef' was updated");

  ok(store.readDataHash(sk2)['array_key'] !== store.readDataHash(sk1)['array_key'], "the default value for 'array' is a copy not a reference");
  ok(store.readDataHash(sk2)['funcDef_key'] !== store.readDataHash(sk1)['funcDef_key'], "the default value for 'funcDef' is a copy not a reference");
});

test("The data hash of the record should be correct BEFORE the status changes.", function () {
  var rec1;

  //create record
  rec1 = store.createRecord(MyRecordType, { string: "Pre-create" }, 'test-status');
  rec1.commitRecord();

  rec1.addObserver('status', function () {
    if (this.get('status') === SC.Record.READY_CLEAN) {
      equals(this.get('id'), 'new-id', "The id attribute should be correct since the status has updated.");
      equals(this.get('string'), "Post-create", "The string attribute should be correct since the status has updated.");
    }
  });

  store.dataSourceDidComplete(rec1.get('storeKey'), { string: "Post-create" }, 'new-id');
});
