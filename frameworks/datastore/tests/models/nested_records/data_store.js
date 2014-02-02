/**
 * Nested Records and the Data Store(SC.Record) Unit Test
 *
 * @author Evin Grano
 */
/*global ok, equals, test, module */

// ..........................................................
// Basic Set up needs to move to the setup and teardown
//
var NestedRecord, store, storeKeys;

var initModels = function () {
  NestedRecord.Directory = SC.Record.extend({
    /** Child Record Namespace */
    nestedRecordNamespace: NestedRecord,
    name: SC.Record.attr(String),
    contents: SC.Record.toMany('SC.Record', { isNested: true })
  });

  NestedRecord.File = SC.Record.extend({
    name: SC.Record.attr(String)
  });

};

// ..........................................................
// Basic SC.Record Stuff
//
module("Data Store Tests for Nested Records", {

  setup: function () {
    SC.RunLoop.begin();
    NestedRecord = SC.Object.create({
      store: SC.Store.create()
    });
    store = NestedRecord.store;
    initModels();

    storeKeys = store.loadRecords([NestedRecord.Directory, NestedRecord.File], [
      {
        type: 'Directory',
        name: 'Dir 1',
        guid: 1,
        contents: [
          {
            type: 'Directory',
            name: 'Dir 2',
            guid: 2,
            contents: [
              {
                type: 'File',
                guid: 3,
                name: 'File 1'
              },
              {
                type: 'File',
                guid: 4,
                name: 'File 2'
              }
            ]
          }
        ]
      },
      {
        type: 'File',
        id: 5,
        name: 'File 3'
      }
    ]);
    SC.RunLoop.end();
  },

  teardown: function () {
    delete NestedRecord.Directory;
    delete NestedRecord.File;
    NestedRecord = null;
    store = null;
  }
});

test("Proper Initialization", function () {
  var first, second;
  equals(storeKeys.get('length'), 2, "number of primary store keys should be 2");

 
  // First
  SC.run(function() { first = store.materializeRecord(storeKeys[0]); });
  ok(SC.kindOf(first, SC.Record), "first record is a kind of a SC.Record Object");
  ok(SC.instanceOf(first, NestedRecord.Directory), "first record is a instance of a NestedRecord.Directory Object");

  // Second
  SC.run(function() { second = store.materializeRecord(storeKeys[1]); });
  ok(SC.kindOf(second, SC.Record), "second record is a kind of a SC.Record Object");
  ok(SC.instanceOf(second, NestedRecord.File), "second record is a instance of a NestedRecord.File Object");
});

test("Proper Status", function () {
  var first, second;

  // First
  SC.run(function() { first = store.materializeRecord(storeKeys[0]); });
  equals(first.get('status'), SC.Record.READY_CLEAN, 'first record has a READY_CLEAN State');

  // Second
  SC.run(function() { second = store.materializeRecord(storeKeys[1]); });
  equals(second.get('status'), SC.Record.READY_CLEAN, 'second record has a READY_CLEAN State');
});

test("Can Push onto child array", function () {
  var first, contents;

  // First
  SC.run(function() {
    first = store.materializeRecord(storeKeys[0]);
    first = first.get('contents').objectAt(0);
    contents = first.get('contents');
    equals(contents.get('length'), 2, "should have two items");
    contents.forEach(function (f) {
    ok(SC.instanceOf(f, NestedRecord.File), "should be a NestedRecord.File");
    ok(f.get('name'), "should have a name property");
    });
    
    contents.pushObject({type: 'File', name: 'File 4', id: 12});
    
    equals(contents.get('length'), 3, "should have three items");
    contents.forEach(function (f) {
    ok(SC.instanceOf(f, NestedRecord.File), "should be a NestedRecord.File");
    ok(f.get('name'), "should have a name property");
    equals(f.get('status'), SC.Record.READY_DIRTY, 'second record has a READY_CLEAN State');
    
    });
  });

});

test("Use in Nested Store", function () {
  var nstore, dir, c, file,
      pk, id, nFile, nDir;

  // First, find the first file
  SC.run(function() { dir = store.find(NestedRecord.Directory, 1); });
  ok(dir, "Directory id:1 exists");
  equals(dir.get('name'), 'Dir 1', "Directory id:1 has a name of 'Dir 1'");
  c = dir.get('contents');
  ok(c, "Content of Directory id:1 exists");
  SC.run(function() {dir = c.objectAt(0);});
  ok(dir, "Directory id:2 exists");
  equals(dir.get('name'), 'Dir 2', "Directory id:2 has a name of 'Dir 2'");
  c = dir.get('contents');
  ok(c, "Content of Directory id:2 exists");
  SC.run(function() {file = c.objectAt(0);});
  ok(file, "File id:1 exists");
  equals(file.get('name'), 'File 1', "File id:1 has a name of 'File 1'");

  // Second, create nested store
  nstore = store.chain();
  SC.RunLoop.begin();
  pk = file.get('primaryKey');
  id = file.get(pk);
  nFile = nstore.find(NestedRecord.File, id);
  SC.RunLoop.end();
  ok(nFile, "Nested > File id:1 exists");
  equals(nFile.get('name'), 'File 1', "Nested > File id:1 has a name of 'File 1'");

  // Third, change the name of the nested store and see what happens
  SC.run(function(){nFile.set('name', 'Change Name');});
  equals(nFile.get('name'), 'Change Name', "Nested > File id:1 has changed the name to 'Changed Name'");
  equals(file.get('name'), 'File 1', "Base > File id:1 still has the name of 'File 1'");
  nDir = nstore.find(NestedRecord.Directory, 1);

  // Fourth, commit the changes
  SC.run(function(){
    nstore.commitChanges();
    nstore.destroy();
  });
  nstore = null;
  equals(file.get('name'), 'Change Name', "Base > File id:1 has changed to name of 'Changed Name'");

  // Fifth, double check that the change exists
  dir = store.find(NestedRecord.Directory, 1);
  SC.run(function() {
     file = dir.get('contents').objectAt(0).get('contents').objectAt(0);
  });
  equals(dir.get('status'), SC.Record.READY_DIRTY, 'Base > Directory id:1 has a READY_DIRTY State');
  equals(file.get('status'), SC.Record.READY_DIRTY, 'Base > File id:1 has a READY_DIRTY State');
  equals(file.get('name'), 'Change Name', "Base > File id:1 has actually changed to name of 'Changed Name'");

});

test("Store#pushRetrieve for parent updates the child records", function () {
  SC.RunLoop.begin()
  var parent = store.materializeRecord(storeKeys[0]),
    nr = parent.get('contents').firstObject(),
    newDataHash = {
      type: 'Directory',
      name: 'Dir 1 Changed',
      guid: 1,
      contents: [
        {
          type: 'Directory',
          name: 'Dir 2 Changed',
          guid: 2,
          contents: [
            {
              type: 'File',
              guid: 3,
              name: 'File 1'
            },
            {
              type: 'File',
              guid: 4,
              name: 'File 2'
            }
          ]
        }
      ]
    };

  parent = store.materializeRecord(storeKeys[0]);
  nr = parent.get('contents').firstObject();

  ok(nr, "Got nested record");
  equals(nr.get('name'), 'Dir 2', "Dir id:2 has correct name");

  store.pushRetrieve(null, null, newDataHash, storeKeys[0]);
  store.flush();
  SC.RunLoop.end()

  equals(parent.get('name'), 'Dir 1 Changed', 'Dir id:1 name was changed');
  equals(nr.get('name'), 'Dir 2 Changed', "Dir id:2 name was changed");
});

test("Store#pushRetrieve for parent updates the child records, even on different path", function () {
  SC.RunLoop.begin()
  var parent = store.materializeRecord(storeKeys[0]),
    nr = parent.get('contents').firstObject(),
    newDataHash = {
      type: 'Directory',
      name: 'Dir 1 Changed',
      guid: 1,
      contents: [
        {
          type: 'Directory',
          name: 'Dir 3',
          guid: 5,
          contents: [
            {
              type: 'File',
              guid: 6,
              name: 'File 6'
            },
            {
              type: 'File',
              guid: 7,
              name: 'File 7'
            }
          ]
        },
        {
          type: 'Directory',
          name: 'Dir 2 Changed',
          guid: 2,
          contents: [
            {
              type: 'File',
              guid: 3,
              name: 'File 1'
            },
            {
              type: 'File',
              guid: 4,
              name: 'File 2'
            }
          ]
        }
      ]
    };

  parent = store.materializeRecord(storeKeys[0]);
  nr = store.find(NestedRecord.Directory,2);

  ok(nr, "Got nested record");
  equals(nr.get('name'), 'Dir 2', "Dir id:2 has correct name");

  store.pushRetrieve(null, null, newDataHash, storeKeys[0]);
  store.flush();
  SC.RunLoop.end()

  equals(parent.get('name'), 'Dir 1 Changed', 'Dir id:1 name was changed');
  equals(nr.get('name'), 'Dir 2 Changed', "Dir id:2 name has changed");
});

test("Store#pushRetrieve for parent updates the child records, works on first object", function () {
  SC.RunLoop.begin()
  var parent = store.materializeRecord(storeKeys[0]),
    nr = parent.get('contents').firstObject(),
    newDataHash = {
      type: 'Directory',
      name: 'Dir 1 Changed',
      guid: 1,
      contents: [
        {
          type: 'Directory',
          name: 'Dir 3',
          guid: 5,
          contents: [
            {
              type: 'File',
              guid: 6,
              name: 'File 6'
            },
            {
              type: 'File',
              guid: 7,
              name: 'File 7'
            }
          ]
        },
        {
          type: 'Directory',
          name: 'Dir 2 Changed',
          guid: 2,
          contents: [
            {
              type: 'File',
              guid: 3,
              name: 'File 1'
            },
            {
              type: 'File',
              guid: 4,
              name: 'File 2'
            }
          ]
        }
      ]
    };

  parent = store.materializeRecord(storeKeys[0]);
  nr = parent.get('contents').firstObject();

  ok(nr, "Got nested record");
  equals(nr.get('name'), 'Dir 2', "Dir id:2 has correct name");

  store.pushRetrieve(null, null, newDataHash, storeKeys[0]);
  store.flush();
  SC.RunLoop.end()

  equals(parent.get('name'), 'Dir 1 Changed', 'Dir id:1 name was changed');
  equals(nr.get('name'), 'Dir 2 Changed', "First object name has changed");
});

test("Store#pushRetrieve for parent updates the child records, on paths nested more than 2 levels", function () {
  SC.RunLoop.begin()
  var parent = store.materializeRecord(storeKeys[0]),
    nr = parent.get('contents').firstObject().get('contents').firstObject(),
    newDataHash = {
      type: 'Directory',
      name: 'Dir 1 Changed',
      guid: 1,
      contents: [
        {
          type: 'Directory',
          name: 'Dir 3',
          guid: 5,
          contents: [
            {
              type: 'File',
              guid: 6,
              name: 'File 6'
            },
            {
              type: 'File',
              guid: 7,
              name: 'File 7'
            }
          ]
        },
        {
          type: 'Directory',
          name: 'Dir 2 Changed',
          guid: 2,
          contents: [
            {
              type: 'File',
              guid: 3,
              name: 'File 1 Changed'
            },
            {
              type: 'File',
              guid: 4,
              name: 'File 2'
            }
          ]
        }
      ]
    };
  
  ok(nr, "(deep walk) Got nested record");
  equals(nr.get('name'), 'File 1', "(deep walk) File id:3 has correct name");

  parent = store.materializeRecord(storeKeys[0]);
  nr = store.find(NestedRecord.File,3);

  ok(nr, "Got nested record");
  equals(nr.get('name'), 'File 1', "File id:3 has correct name");

  store.pushRetrieve(null, null, newDataHash, storeKeys[0]);
  store.flush();
  SC.RunLoop.end()

  equals(parent.get('name'), 'Dir 1 Changed', 'Dir id:1 name was changed');
  equals(nr.get('name'), 'File 1 Changed', "File id:3 name has changed");
});
