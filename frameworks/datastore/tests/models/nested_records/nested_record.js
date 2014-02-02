/**
 * Nested Records (SC.Record) Unit Test
 *
 * @author Evin Grano
 */

// ..........................................................
// Basic Set up needs to move to the setup and teardown
//
var NestedRecord, store, testParent, testParent2, testParent3, childData1;

var initModels = function() {
  NestedRecord.ParentRecordTest = SC.Record.extend({
    /** Child Record Namespace */
    nestedRecordNamespace: NestedRecord,

    name: SC.Record.attr(String),
    info: SC.Record.toOne('NestedRecord.ChildRecordTest', { nested: true })
  });

  NestedRecord.ChildRecordTest = SC.Record.extend({
    name: SC.Record.attr(String),
    value: SC.Record.attr(String)
  });
};

// ..........................................................
// Basic SC.Record Stuff
//
module("Basic SC.Record Functions w/ Parent > Child", {

  setup: function() {
    NestedRecord = SC.Object.create({
      store: SC.Store.create()
    });
    window.NestedRecord = NestedRecord;
    store = NestedRecord.store;
    initModels();
    SC.RunLoop.begin();
    // Test Parent 1
    testParent = store.createRecord(NestedRecord.ParentRecordTest, {
      guid: 'p1',
      name: 'Parent Name',
      info: {
        type: 'ChildRecordTest',
        name: 'Child Name',
        value: 'Blue Goo',
        guid: '5001'
      }
    });
    // Test parent 2
    testParent2 = NestedRecord.store.createRecord(NestedRecord.ParentRecordTest, {
      guid: 'p2',
      name: 'Parent Name 2',
      info: {
        type: 'ChildRecordTest',
        name: 'Child Name 2',
        value: 'Purple Goo',
        guid: '5002'
      }
    });
    // Test parent 3
    testParent3 = NestedRecord.store.createRecord(NestedRecord.ParentRecordTest, {
      guid: 'p3',
      name: 'Parent Name 3',
      info: {
        type: 'ChildRecordTest',
        name: 'Child Name 3',
        value: 'Pink Goo'
      }
    });
    SC.RunLoop.end();


    // ..........................................................
    // Child Data
    //
    childData1 = {
      type: 'ChildRecordTest',
      name: 'Child Name',
      value: 'Green Goo',
      guid: '5002'
    };
  },

  teardown: function() {
    delete NestedRecord.ParentRecordTest;
    delete NestedRecord.ChildRecordTest;
    testParent = null;
    testParent2 = null;
    store = null;
    childData1 = null;
    NestedRecord = null;
    //delete(window.NestedRecord);
  }
});

test("Function: readAttribute()", function() {
  equals(testParent.readAttribute('name'), 'Parent Name', "readAttribute should be correct for name attribute");

  equals(testParent.readAttribute('nothing'), null, "readAttribute should be correct for invalid key");

  same(testParent.readAttribute('info'),
    {
      type: 'ChildRecordTest',
      name: 'Child Name',
      value: 'Blue Goo',
      guid: '5001'
    },
    "readAttribute should be correct for info child attribute");

});

test("Support Multiple Parent Records With Different Child Records", function() {

  same(testParent3.readAttribute('info'),
    {
      type: 'ChildRecordTest',
      name: 'Child Name 3',
      value: 'Pink Goo'
    },
    "readAttribute should be correct for info child attribute on new record");
  equals(testParent3.get('info').get('value'), 'Pink Goo', "get should retrieve the proper value on new record");

  same(testParent2.readAttribute('info'),
    {
      type: 'ChildRecordTest',
      name: 'Child Name 2',
      value: 'Purple Goo',
      guid: '5002'
    },
    "readAttribute should be correct for info child attribute on new record");
  equals(testParent2.get('info').get('value'), 'Purple Goo', "get should retrieve the proper value on new record");

  same(testParent.readAttribute('info'),
    {
      type: 'ChildRecordTest',
      name: 'Child Name',
      value: 'Blue Goo',
      guid: '5001'
    },
    "readAttribute should be correct for info child attribute on first record");
  equals(testParent.get('info').get('value'), 'Blue Goo', "get should retrieve the proper value on first record");
});

test("Function: writeAttribute()", function() {

  testParent.writeAttribute('name', 'New Parent Name');
  equals(testParent.get('name'), 'New Parent Name', "writeAttribute should be the new name attribute");

  testParent.writeAttribute('nothing', 'nothing');
  equals(testParent.get('nothing'), 'nothing', "writeAttribute should be correct for new key");

  testParent.writeAttribute('info', {
    type: 'ChildRecordTest',
    name: 'New Child Name',
    value: 'Red Goo'
  });
  same(testParent.readAttribute('info'),
    {
      type: 'ChildRecordTest',
      name: 'New Child Name',
      value: 'Red Goo'
    },
    "writeAttribute with readAttribute should be correct for info child attribute");

  testParent3.writeAttribute('info', {
    type: 'ChildRecordTest',
    name: 'New Child Name',
    value: 'Red Goo'
  });
  same(testParent3.readAttribute('info'),
    {
      type: 'ChildRecordTest',
      name: 'New Child Name',
      value: 'Red Goo'
    },
    "writeAttribute with readAttribute should be correct for info child attribute");
});

test("Basic Read", function() {
  var id;
  // Test general gets
  equals(testParent.get('name'), 'Parent Name', "get should be correct for name attribute");
  equals(testParent.get('nothing'), null, "get should be correct for invalid key");

  // Test Child Record creation
  var cr = testParent.get('info');
  // Check Model Class information
  ok(SC.kindOf(cr, SC.Record), "get() creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest), "get() creates an actual instance of a ChildRecordTest Object");

  // Check reference information
  var pm = cr.get('primaryKey');
  var key = cr.get(pm);
  var storeRef = store.find(NestedRecord.ChildRecordTest, key);
  ok(storeRef, 'checking that the store has the instance of the child record with proper primary key');
  equals(cr, storeRef, "checking the parent reference is the same as the direct store reference");

  // Check to see if the attributes of a Child Record match the reference of the parent
  same(storeRef.get('attributes'), testParent.readAttribute('info'), "check that the ChildRecord's attributes are the same as the ParentRecord's readAttribute for the reference");

  // Duplication check
  var sameCR = testParent.get('info');
  ok(sameCR, "check to see if we have an instance of a child record again");
  var oldKey = cr.get(pm), newKey = sameCR.get(pm);
  equals(oldKey, newKey, "check to see if the Primary Key are the same");
  same(sameCR, cr, "check to see that it is the same child record as before");
});

test("Basic Read when Child Record has no primary key", function() {
  var id;
  // Test general gets
  equals(testParent3.get('name'), 'Parent Name 3', "get should be correct for name attribute");
  equals(testParent3.get('nothing'), null, "get should be correct for invalid key");

  // Test Child Record creation
  var cr = testParent3.get('info');
  // Check Model Class information
  ok(SC.kindOf(cr, SC.Record), "get() creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest), "get() creates an actual instance of a ChildRecordTest Object");

  // Check reference information
  var key = cr.get('id');
  var storeRef = store.find(NestedRecord.ChildRecordTest, key);
  ok(storeRef, 'checking that the store has the instance of the child record with proper primary key');
  equals(cr, storeRef, "checking the parent reference is the same as the direct store reference");

  // Check to see if the attributes of a Child Record match the reference of the parent
  same(storeRef.get('attributes'), testParent3.readAttribute('info'), "check that the ChildRecord's attributes are the same as the ParentRecord's readAttribute for the reference");

  // Duplication check
  var sameCR = testParent3.get('info');
  ok(sameCR, "check to see if we have an instance of a child record again");
  var oldKey = cr.get('id'), newKey = sameCR.get('id');
  equals(oldKey, newKey, "check to see if the Primary Key are the same");
  same(sameCR, cr, "check to see that it is the same child record as before");
});

test("Basic Write As a Hash", function() {

  // Test general gets
  testParent.set('name', 'New Parent Name');
  equals(testParent.get('name'), 'New Parent Name', "set() should change name attribute");
  testParent.set('nothing', 'nothing');
  equals(testParent.get('nothing'), 'nothing', "set should change non-existent property to a new property");

  // Test Child Record creation
  var oldCR = testParent.get('info');
  testParent.set('info', {
    type: 'ChildRecordTest',
    name: 'New Child Name',
    value: 'Red Goo',
    guid: '6001'
  });
  var cr = testParent.get('info');
  // Check Model Class information
  ok(SC.kindOf(cr, SC.Record), "set() with an object creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest), "set() with an object creates an actual instance of a ChildRecordTest Object");

  // Check reference information
  var pm = cr.get('primaryKey');
  var key = cr.get(pm);
  var storeRef = store.find(NestedRecord.ChildRecordTest, key);
  ok(storeRef, 'after a set() with an object, checking that the store has the instance of the child record with proper primary key');
  equals(cr, storeRef, "after a set with an object, checking the parent reference is the same as the direct store reference");
  var oldKey = oldCR.get(pm);
  ok(!(oldKey === key), 'check to see that the old child record has a different key from the new child record');

  // Check for changes on the child bubble to the parent.
  cr.set('name', 'Child Name Change');
  equals(cr.get('name'), 'Child Name Change', "after a set('name', <new>) on child, checking that the value is updated");
  ok(cr.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty');
  var newCR = testParent.get('info');
  same(newCR, cr, "after a set('name', <new>) on child, checking to see that the parent has received the changes from the child record");
  same(testParent.readAttribute('info'), cr.get('attributes'), "after a set('name', <new>) on child, readAttribute on the parent should be correct for info child attributes");
});

test("Basic Write As a Hash when Child Record has no primary key", function() {

  // Test general gets
  testParent3.set('name', 'New Parent Name');
  equals(testParent3.get('name'), 'New Parent Name', "set() should change name attribute");
  testParent3.set('nothing', 'nothing');
  equals(testParent3.get('nothing'), 'nothing', "set should change non-existent property to a new property");

  // Test Child Record creation
  var oldCR = testParent3.get('info');
  testParent3.set('info', {
    type: 'ChildRecordTest',
    name: 'New Child Name',
    value: 'Red Goo'
  });
  var cr = testParent3.get('info');
  // Check Model Class information
  ok(SC.kindOf(cr, SC.Record), "set() with an object creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest), "set() with an object creates an actual instance of a ChildRecordTest Object");

  // Check reference information
  var key = cr.get('id');
  var storeRef = store.find(NestedRecord.ChildRecordTest, key);
  ok(storeRef, 'after a set() with an object, checking that the store has the instance of the child record with proper primary key');
  equals(cr, storeRef, "after a set with an object, checking the parent reference is the same as the direct store reference");
  var oldKey = oldCR.get('id');
  ok((oldKey === key), 'check to see that the old child record has the same key as the new child record');

  // Check for changes on the child bubble to the parent.
  cr.set('name', 'Child Name Change');
  equals(cr.get('name'), 'Child Name Change', "after a set('name', <new>) on child, checking that the value is updated");
  ok(cr.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
  ok(testParent3.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty');
  var newCR = testParent3.get('info');
  same(newCR, cr, "after a set('name', <new>) on child, checking to see that the parent has received the changes from the child record");
  same(testParent3.readAttribute('info'), cr.get('attributes'), "after a set('name', <new>) on child, readAttribute on the parent should be correct for info child attributes");
});

test("Basic Write As a Child Record", function() {

  // Test general gets
  testParent.set('name', 'New Parent Name');
  equals(testParent.get('name'), 'New Parent Name', "set() should change name attribute");
  testParent.set('nothing', 'nothing');
  equals(testParent.get('nothing'), 'nothing', "set should change non-existent property to a new property");

  // Test Child Record creation
  var store = testParent.get('store');
  var cr = store.createRecord(NestedRecord.ChildRecordTest, {type: 'ChildRecordTest', name: 'New Child Name', value: 'Red Goo', guid: '6001'});
  // Check Model Class information
  ok(SC.kindOf(cr, SC.Record), "before the set(), check for actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest), "before the set(), check for actual instance of a ChildRecordTest Object");
  testParent.set('info', cr);
  cr = testParent.get('info');
  // Check Model Class information
  ok(SC.kindOf(cr, SC.Record), "set() with an object creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest), "set() with an object creates an actual instance of a ChildRecordTest Object");

  // Check reference information
  var pm = cr.get('primaryKey');
  var key = cr.get(pm);
  var storeRef = store.find(NestedRecord.ChildRecordTest, key);
  ok(storeRef, 'after a set() with an object, checking that the store has the instance of the child record with proper primary key');
  equals(cr, storeRef, "after a set with an object, checking the parent reference is the same as the direct store reference");

  // Check for changes on the child bubble to the parent.
  cr.set('name', 'Child Name Change');
  equals(cr.get('name'), 'Child Name Change', "after a set('name', <new>) on child, checking that the value is updated");
  ok(cr.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty');
  var newCR = testParent.get('info');
  same(newCR, cr, "after a set('name', <new>) on child, checking to see that the parent has received the changes from the child record");
  same(testParent.readAttribute('info'), cr.get('attributes'), "after a set('name', <new>) on child, readAttribute on the parent should be correct for info child attributes");

  // Make sure you can set the child to null.
  testParent.set('info', null);
  equals(testParent.get('info'), null, 'should be able to set child record to null');
});

test("Basic Write As a Child Record when Child Record has no primary key", function() {

  // Test general gets
  testParent3.set('name', 'New Parent Name');
  equals(testParent3.get('name'), 'New Parent Name', "set() should change name attribute");
  testParent3.set('nothing', 'nothing');
  equals(testParent3.get('nothing'), 'nothing', "set should change non-existent property to a new property");

  // Test Child Record creation
  var store = testParent3.get('store');
  var cr = store.createRecord(NestedRecord.ChildRecordTest, {type: 'ChildRecordTest', name: 'New Child Name', value: 'Red Goo', guid: '6001'});
  // Check Model Class information
  ok(SC.kindOf(cr, SC.Record), "before the set(), check for actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest), "before the set(), check for actual instance of a ChildRecordTest Object");
  testParent3.set('info', cr);
  cr = testParent3.get('info');
  // Check Model Class information
  ok(SC.kindOf(cr, SC.Record), "set() with an object creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest), "set() with an object creates an actual instance of a ChildRecordTest Object");

  // Check reference information
  var key = cr.get('id');
  var storeRef = store.find(NestedRecord.ChildRecordTest, key);
  ok(storeRef, 'after a set() with an object, checking that the store has the instance of the child record with proper primary key');
  equals(cr, storeRef, "after a set with an object, checking the parent reference is the same as the direct store reference");

  // Check for changes on the child bubble to the parent.
  cr.set('name', 'Child Name Change');
  equals(cr.get('name'), 'Child Name Change', "after a set('name', <new>) on child, checking that the value is updated");
  ok(cr.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
  ok(testParent3.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty');
  var newCR = testParent3.get('info');
  same(newCR, cr, "after a set('name', <new>) on child, checking to see that the parent has received the changes from the child record");
  same(testParent3.readAttribute('info'), cr.get('attributes'), "after a set('name', <new>) on child, readAttribute on the parent should be correct for info child attributes");

  // Make sure you can set the child to null.
  testParent3.set('info', null);
  equals(testParent3.get('info'), null, 'should be able to set child record to null');
});

test("Writing over a child record should remove caches in the store.", function() {
  // Test Child Record creation
  var cr, key, store = testParent.get('store'), cacheLength;

  // Get the child record once before setting it in order to test that this child
  // doesn't become abandoned in the store.
  cr = testParent.get('info');

  // Once we get the child record, certain caches are created in the store.
  // Verify the cache lengths to prove that there are no leaked objects.
  cacheLength = 0;
  for (key in store.parentRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one parent record registered in the store');

  cacheLength = 0;
  for (key in store.childRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one child record registered in the store');

  cacheLength = 0;
  for (key in store.records) { cacheLength += 1; }
  equals(cacheLength, 4, 'there should be four records cached in the store');

  cacheLength = 0;
  for (key in store.dataHashes) { if (store.dataHashes[key] !== null) cacheLength += 1; }
  equals(cacheLength, 4, 'there should be four non-null datahashes in the store');

  // Overwrite the child record with a new child record with the same guid.
  testParent.set('info', {type: 'ChildRecordTest', name: 'New Child Name', value: 'Red Goo', guid: '5001'});
  cr = testParent.get('info');

  // Verify the cache lengths to prove that there are no leaked objects.
  cacheLength = 0;
  for (key in store.parentRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one parent record registered in the store after replacing child record once');

  cacheLength = 0;
  for (key in store.childRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one child record registered in the store after replacing child record once');

  cacheLength = 0;
  for (key in store.records) { cacheLength += 1; }
  equals(cacheLength, 4, 'there should be four records cached in the store after replacing child record once');

  cacheLength = 0;
  for (key in store.dataHashes) { if (store.dataHashes[key] !== null) cacheLength += 1; }
  equals(cacheLength, 4, 'there should be four non-null datahashes in the store after replacing child record once');

  // Overwrite the child record with a new child record with the same guid.
  testParent.set('info', store.createRecord(NestedRecord.ChildRecordTest, {type: 'ChildRecordTest', name: 'New Child Name', value: 'Orange Goo', guid: '6001'}));
  cr = testParent.get('info');

  // Verify the cache lengths to prove that there are no leaked objects.
  cacheLength = 0;
  for (key in store.parentRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one parent record registered in the store after replacing child record twice');

  cacheLength = 0;
  for (key in store.childRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one child record registered in the store after replacing child record twice');

  cacheLength = 0;
  for (key in store.records) { cacheLength += 1; }
  equals(cacheLength, 4, 'there should be four records cached in the store after replacing child record twice');

  cacheLength = 0;
  for (key in store.dataHashes) { if (store.dataHashes[key] !== null) cacheLength += 1; }
  equals(cacheLength, 4, 'there should be four non-null datahashes in the store after replacing child record twice');

  // Make sure you can set the child to null.
  testParent.set('info', null);
  cr = testParent.get('info');

  // Verify the cache lengths to prove that there are no leaked objects.
  cacheLength = 0;
  for (key in store.parentRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one parent record registered in the store after removing child record');

  cacheLength = 0;
  for (key in store.childRecords) { cacheLength += 1; }
  equals(cacheLength, 0, 'there should be no child record registered in the store after removing child record');

  cacheLength = 0;
  for (key in store.records) { cacheLength += 1; }
  equals(cacheLength, 3, 'there should be three records cached in the store after removing child record');

  cacheLength = 0;
  for (key in store.dataHashes) { if (store.dataHashes[key] !== null) cacheLength += 1; }
  equals(cacheLength, 3, 'there should be three non-null datahashes in the store after removing child record');
});

test("Child Status Changed", function() {
  var cr;
  cr = testParent.get('info');
  equals(cr.get('status'), testParent.get('status'), 'after initializing the parent to READY_NEW, check that the child record matches');

  SC.RunLoop.begin();
  store.writeStatus(testParent.storeKey, SC.Record.READY_DIRTY);
  store.dataHashDidChange(testParent.storeKey);
  equals(cr.get('status'), testParent.get('status'), 'after setting the parent to READY_DIRTY, check that the child record matches');
  SC.RunLoop.end();

  SC.RunLoop.begin();
  store.writeStatus(testParent.storeKey, SC.Record.BUSY_REFRESH);
  store.dataHashDidChange(testParent.storeKey);
  equals(cr.get('status'), testParent.get('status'), 'after setting the parent to BUSY_REFRESH, check that the child record matches');
  SC.RunLoop.end();
});

test("Child Status Matches Store Status", function() {
  var cr;
  var storeStatus;
  cr = testParent.get('info');

  storeStatus = store.readStatus(cr.storeKey);
  equals(storeStatus, cr.get('status'), 'after initializing the parent to READY_NEW, check that the store status matches for the child');
  equals(cr.get('status'), testParent.get('status'), 'after initializing the parent to READY_NEW, check that the child record matches');

  SC.RunLoop.begin();
  store.writeStatus(testParent.storeKey, SC.Record.READY_CLEAN);
  store.dataHashDidChange(testParent.storeKey);
  SC.RunLoop.end();

  storeStatus = store.readStatus(cr.storeKey);
  equals(testParent.get('status'), SC.Record.READY_CLEAN, 'parent status should be READY_CLEAN');
  equals(storeStatus, cr.get('status'), 'after setting the parent to READY_CLEAN, the child\'s status and store status should be READY_CLEAN before calling get(\'status\') on the child');
  equals(cr.get('status'), testParent.get('status'), 'after setting the parent to READY_CLEAN, check that the child record matches');

  SC.RunLoop.begin();
  store.writeStatus(testParent.storeKey, SC.Record.READY_DIRTY);
  store.dataHashDidChange(testParent.storeKey);
  SC.RunLoop.end();

  storeStatus = store.readStatus(cr.storeKey);
  equals(testParent.get('status'), SC.Record.READY_DIRTY, 'parent status should be READY_DIRTY');
  equals(storeStatus, cr.get('status'), 'after setting the parent to READY_DIRTY, the child\'s status and store status should be READY_DIRTY before calling get(\'status\') on the child');
  equals(cr.get('status'), testParent.get('status'), 'after setting the parent to READY_DIRTY, check that the child record matches');

  SC.RunLoop.begin();
  store.writeStatus(testParent.storeKey, SC.Record.BUSY_REFRESH);
  store.dataHashDidChange(testParent.storeKey);
  storeStatus = store.readStatus(cr.storeKey);
  SC.RunLoop.end();

  equals(testParent.get('status'), SC.Record.BUSY_REFRESH, 'parent status should be BUSY_REFRESH');
  equals(storeStatus, cr.get('status'), 'after setting the parent to BUSY_REFRESH, the child\'s status and store status should be BUSY_REFRESH before calling get(\'status\') on the child');
  equals(cr.get('status'), testParent.get('status'), 'after setting the parent to BUSY_REFRESH, check that the child record matches');
});

/**
  This test illustrates that unloading the parent record also unloads the child
  record.
*/
test("Unloading the parent record also unloads the child record.", function() {
  var parentId, child, childId, parentStoreKey, childStoreKey;

  parentId = testParent3.get('id');
  parentStoreKey = testParent3.get('storeKey');
  child = testParent3.get('info');
  childId = child.get('id');
  childStoreKey = child.get('storeKey');

  store.unloadRecord(NestedRecord.ParentRecordTest, parentId);

  equals(testParent3.get('status'), SC.Record.EMPTY, 'parent status should be EMPTY');
  equals(child.get('status'), SC.Record.EMPTY, 'child status should be EMPTY');
});

/**
  This test illustrates that reloading the parent record doesn't create
  duplicates of the child record.
*/
test("Reloading the parent record uses same child record.", function() {
  var parentId, child, childId, parentStoreKey, childStoreKey, newChildStoreKey;
  var key, cacheLength;

  parentId = testParent3.get('id');
  parentStoreKey = testParent3.get('storeKey');
  child = testParent3.get('info');
  childId = child.get('id');
  childStoreKey = child.get('storeKey');

  // Once we get the child record, certain caches are created in the store.
  // Verify the cache lengths to prove that there are no leaked objects.
  cacheLength = 0;
  for (key in store.parentRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one parent record registered in the store');

  cacheLength = 0;
  for (key in store.childRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one child record registered in the store');

  cacheLength = 0;
  for (key in store.records) { cacheLength += 1; }
  equals(cacheLength, 4, 'there should be four records cached in the store');

  cacheLength = 0;
  for (key in store.dataHashes) { if (store.dataHashes[key] !== null) cacheLength += 1; }
  equals(cacheLength, 4, 'there should be four non-null datahashes in the store');

  // Unload the record
  store.unloadRecord(NestedRecord.ParentRecordTest, parentId);

  equals(testParent3.get('status'), SC.Record.EMPTY, 'parent status should be EMPTY');
  equals(child.get('status'), SC.Record.EMPTY, 'child status should be EMPTY');

  // Verify the cache lengths to prove that there are no leaked objects.
  cacheLength = 0;
  for (key in store.parentRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one parent record registered in the store');

  cacheLength = 0;
  for (key in store.childRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one child record registered in the store');

  cacheLength = 0;
  for (key in store.records) { cacheLength += 1; }
  equals(cacheLength, 4, 'there should be four records cached in the store');

  cacheLength = 0;
  for (key in store.dataHashes) { if (store.dataHashes[key] !== null) cacheLength += 1; }
  equals(cacheLength, 2, 'there should be two non-null datahashes in the store');

  // Reload the record
  SC.RunLoop.begin();
  store.loadRecord(NestedRecord.ParentRecordTest, {
      name: 'Parent Name 3',
      info: {
        type: 'ChildRecordTest',
        name: 'Child Name 3',
        value: 'Pink Goo'
      }
    },
    parentId);
  SC.RunLoop.end();

  child = testParent3.get('info');
  equals(testParent3.get('status'), SC.Record.READY_CLEAN, 'parent status should be READY_CLEAN');
  equals(child.get('status'), SC.Record.READY_CLEAN, 'child status should be READY_CLEAN');

  // Verify the cache lengths to prove that there are no leaked objects.
  cacheLength = 0;
  for (key in store.parentRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one parent record registered in the store');

  cacheLength = 0;
  for (key in store.childRecords) { cacheLength += 1; }
  equals(cacheLength, 1, 'there should only be one child record registered in the store');

  cacheLength = 0;
  for (key in store.records) { cacheLength += 1; }
  equals(cacheLength, 4, 'there should be four records cached in the store');

  cacheLength = 0;
  for (key in store.dataHashes) { if (store.dataHashes[key] !== null) cacheLength += 1; }
  equals(cacheLength, 4, 'there should be four non-null datahashes in the store');
});
