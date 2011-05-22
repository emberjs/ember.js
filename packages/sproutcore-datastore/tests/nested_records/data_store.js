/**
 * Nested Records and the Data Store(SC.Record) Unit Test
 *
 * @author Evin Grano
 */

 var set = SC.set, get = SC.get;

// ..........................................................
// Basic Set up needs to move to the setup and teardown
// 
var NestedRecord, store, storeKeys; 

var initModels = function(){
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

  setup: function() {
    NestedRecord = SC.Object.create({
      store: SC.Store.create()
    });
    store = NestedRecord.store;
    initModels();
    SC.run.begin();
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
    SC.run.end();
  },

  teardown: function() {
    delete NestedRecord.Directory;
    delete NestedRecord.File;
    NestedRecord = null;
    store = null;
  }
});

test("Proper Initialization",function() {
  var first, second;
  equals(get(storeKeys, 'length'), 2, "number of primary store keys should be 2");
  
  // First
  first = store.materializeRecord(storeKeys[0]);
  ok((first instanceof  SC.Record), "first record is a kind of a SC.Record Object");
  ok((first instanceof NestedRecord.Directory), "first record is a instance of a NestedRecord.Directory Object");
  
  // Second
  second = store.materializeRecord(storeKeys[1]);
  ok((second instanceof  SC.Record), "second record is a kind of a SC.Record Object");
  ok((second instanceof NestedRecord.File), "second record is a instance of a NestedRecord.File Object");
});

test("Proper Status",function() {
  var first, second;
  
  // First
  first = store.materializeRecord(storeKeys[0]);
  equals(get(first, 'status'), SC.Record.READY_CLEAN, 'first record has a READY_CLEAN State');
  
  // Second
  second = store.materializeRecord(storeKeys[1]);
  equals(get(second, 'status'), SC.Record.READY_CLEAN, 'second record has a READY_CLEAN State');
});

test("Can Push onto child array",function() {
  var first, contents;
  
  // First
  first = store.materializeRecord(storeKeys[0]);
  first = get(first, 'contents').objectAt(0);
  contents = get(first, 'contents');
  equals(get(contents, 'length'), 2, "should have two items");
  contents.forEach(function(f){
    ok((f instanceof NestedRecord.File), "should be a NestedRecord.File");
    ok(get(f, 'name'), "should have a name property");
  });
  
  contents.pushObject({type: 'File', name: 'File 4', id: 12});
  
  equals(get(contents, 'length'), 3, "should have three items");
  contents.forEach(function(f){
    ok((f instanceof NestedRecord.File), "should be a NestedRecord.File");
    ok(get(f, 'name'), "should have a name property");
    equals(get(f, 'status'), SC.Record.READY_DIRTY, 'second record has a READY_CLEAN State');
    
  });

});

test("Use in Nested Store", function(){
  var nstore, dir, c, file,
      pk, id, nFile, nDir;
    
  // First, find the first file
  dir = store.find(NestedRecord.Directory, 1);
  ok(dir, "Directory id:1 exists"); 
  equals(get(dir, 'name'), 'Dir 1', "Directory id:1 has a name of 'Dir 1'");
  c = get(dir, 'contents');
  ok(c, "Content of Directory id:1 exists");
  dir = c.objectAt(0);
  ok(dir, "Directory id:2 exists"); 
  equals(get(dir, 'name'), 'Dir 2', "Directory id:2 has a name of 'Dir 2'");
  c = get(dir, 'contents');
  ok(c, "Content of Directory id:2 exists");
  file = c.objectAt(0);
  ok(file, "File id:1 exists"); 
  equals(get(file, 'name'), 'File 1', "File id:1 has a name of 'File 1'");
  
  // Second, create nested store
  nstore = store.chain();
  SC.run.begin();
  pk = get(file, 'primaryKey');
  id = get(file, pk);
  nFile = nstore.find(NestedRecord.File, id);
  SC.run.end();
  ok(nFile, "Nested > File id:1 exists"); 
  equals(get(nFile, 'name'), 'File 1', "Nested > File id:1 has a name of 'File 1'");
  
  // Third, change the name of the nested store and see what happens
  set(nFile, 'name', 'Change Name');
  equals(get(nFile, 'name'), 'Change Name', "Nested > File id:1 has changed the name to 'Changed Name'");
  equals(get(file, 'name'), 'File 1', "Base > File id:1 still has the name of 'File 1'");
  nDir = nstore.find(NestedRecord.Directory, 1);
  
  // Fourth, commit the changes
  nstore.commitChanges();
  nstore.destroy();
  nstore = null;
  equals(get(file, 'name'), 'Change Name', "Base > File id:1 has changed to name of 'Changed Name'");
  
  // Fifth, double check that the change exists
  dir = store.find(NestedRecord.Directory, 1);
  file = get(get(dir, 'contents').objectAt(0), 'contents').objectAt(0);
  equals(get(dir, 'status'), SC.Record.READY_DIRTY, 'Base > Directory id:1 has a READY_DIRTY State');
  equals(get(file, 'status'), SC.Record.READY_DIRTY, 'Base > File id:1 has a READY_DIRTY State');
  equals(get(file, 'name'), 'Change Name', "Base > File id:1 has actually changed to name of 'Changed Name'");
  
});
