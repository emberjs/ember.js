/**
 * Nested Records (SC.Record) Unit Test
 *
 * @author Evin Grano
 */

// ..........................................................
// Basic Set up needs to move to the setup and teardown
// 
var NestedRecord, store, testParent, testParent2, childData1; 

var initModels = function(){
  NestedRecord.ParentRecordTest = SC.Record.extend({
    /** Child Record Namespace */
    nestedRecordNamespace: NestedRecord,

    name: SC.Record.attr(String),
    info: SC.Record.toOne('NestedRecord.ChildRecordTest', { nested: true })
  });

  NestedRecord.ChildRecordTest = SC.Record.extend({
    id: SC.Record.attr(String),
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
    store = NestedRecord.store;
    initModels();
    SC.RunLoop.begin();
    // Test Parent 1
    testParent = store.createRecord(NestedRecord.ParentRecordTest, {
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
      name: 'Parent Name 2',
      info: {
        type: 'ChildRecordTest',
        name: 'Child Name 2',
        value: 'Purple Goo',
        guid: '5002'
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
  
  // Check to see if the attributes of a Child Record match the refrence of the parent
  same(storeRef.get('attributes'), testParent.readAttribute('info'), "check that the ChildRecord's attributes are the same as the ParentRecord's readAttribute for the reference");
  
  // Duplication check
  var sameCR = testParent.get('info');
  ok(sameCR, "check to see if we have an instance of a child record again");
  var oldKey = cr.get(pm), newKey = sameCR.get(pm);
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
  same(newCR, cr, "after a set('name', <new>) on child, checking to see that the parent has recieved the changes from the child record");
  same(testParent.readAttribute('info'), cr.get('attributes'), "after a set('name', <new>) on child, readAttribute on the parent should be correct for info child attributes");
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
  same(newCR, cr, "after a set('name', <new>) on child, checking to see that the parent has recieved the changes from the child record");
  same(testParent.readAttribute('info'), cr.get('attributes'), "after a set('name', <new>) on child, readAttribute on the parent should be correct for info child attributes");

  // Make sure you can set the child to null.
  testParent.set('info', null);
  equals(testParent.get('info'), null, 'should be able to set child record to null');
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
