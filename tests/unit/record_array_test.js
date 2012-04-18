var get = Ember.get, set = Ember.set, getPath = Ember.getPath;
var Person;

module("DS.RecordArray");

var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];

module("DS.Store", {
  setup: function() {
    Person = DS.Model.extend({
      name: DS.attr('string')
    });
  },

  teardown: function() {
    Person = null;
    set(DS, 'defaultStore', null);
  }
});

test("a record array is backed by records", function() {
  var store = DS.Store.create({ adapter: null });
  store.loadMany(Person, [1,2,3], array);

  var recordArray = store.find(Person, [1,2,3]);

  for (var i=0, l=get(array, 'length'); i<l; i++) {
    deepEqual(recordArray.objectAt(i).toJSON(), array[i], "a record array materializes objects on demand");
  }
});

test("a loaded record is removed from a record array when it is deleted", function() {
  var store = DS.Store.create({ adapter: null });
  store.loadMany(Person, [1,2,3], array);

  var scumbag = store.find(Person, 1);

  var recordArray = store.find(Person, [1, 2, 3]);
  equal(get(recordArray, 'length'), 3, "precond - record array has three items");
  equal(get(recordArray.objectAt(0), 'name'), "Scumbag Dale", "item at index 0 is record with id 1");

  scumbag.deleteRecord();

  equal(get(recordArray, 'length'), 2, "record is removed from the record array");
  ok(get(recordArray.objectAt(0), 'name') !== "Scumbag Dale", "item was removed");
});

// GitHub Issue #168
test("a newly created record is removed from a record array when it is deleted", function() {
  var store = DS.Store.create({ adapter: null }),
      recordArray;

  Ember.run(function() {
    recordArray = store.findAll(Person);

    var scumbag = store.createRecord(Person, {
      name: "Scumbag Dale"
    });

    store.createRecord(Person, { name: 'p1'});
    store.createRecord(Person, { name: 'p2'});
    store.createRecord(Person, { name: 'p3'});

    equal(get(recordArray, 'length'), 4, "precond - record array has the created item");
    equal(get(recordArray.objectAt(0), 'name'), "Scumbag Dale", "item at index 0 is record with id 1");

    scumbag.deleteRecord();
  });

  Ember.run(function() {
    equal(get(recordArray, 'length'), 3, "record is removed from the record array");
  });
});

test("a record array can have a filter on it", function() {
  var store = DS.Store.create();

  store.loadMany(Person, array);

  var recordArray = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(recordArray, 'length'), 2, "The Record Array should have the filtered objects on it");

  store.load(Person, { id: 4, name: "Scumbag Koz" });

  equal(get(recordArray, 'length'), 3, "The Record Array should be updated as new items are added to the store");

  store.load(Person, { id: 1, name: "Scumbag Tom" });

  equal(get(recordArray, 'length'), 2, "The Record Array should be updated as existing members are updated");
});

test("a filtered record array includes created elements", function() {
  var store = DS.Store.create();

  store.loadMany(Person, array);

  var recordArray = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(recordArray, 'length'), 2, "precond - The Record Array should have the filtered objects on it");

  store.createRecord(Person, { name: "Scumbag Koz" });

  equal(get(recordArray, 'length'), 3, "The record array has the new object on it");
});

test("a record array returns undefined when asking for a member outside of its content Array's range", function() {
  var store = DS.Store.create();

  store.loadMany(Person, array);

  var recordArray = store.find(Person);

  strictEqual(recordArray.objectAt(20), undefined, "objects outside of the range just return undefined");
});

test("a Record Array can update its filter", function() {
  var store = DS.Store.create();

  store.loadMany(Person, array);

  var recordArray = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(recordArray, 'length'), 2, "The Record Array should have the filtered objects on it");

  recordArray.set('filterFunction', function(hash) {
    if (hash.get('name').match(/Katz/)) { return true; }
  });

  equal(get(recordArray, 'length'), 1, "The Record Array should have one object on it");

  store.load(Person, 5, { name: "Other Katz" });

  equal(get(recordArray, 'length'), 2, "The Record Array now has the new object matching the filter");

  store.load(Person, 6, { name: "Scumbag Demon" });

  equal(get(recordArray, 'length'), 2, "The Record Array doesn't have objects matching the old filter");
});

(function(){
  var store, recordArray;

  var clientEdits = function(ids) {
    Ember.run( function() {
      ids.forEach( function(id) {
        var person = store.find(Person, id);
        person.set('name', 'Client-side ' + id );
      });
    });
  };

  var clientCreates = function(names) {
    Ember.run( function() {
      names.forEach( function( name ) {
        Person.createRecord({ name: 'Client-side ' + name });
      });
    });
  };

  var serverResponds = function(){
    Ember.run(function() { store.commit(); });
  };

  var setup = function(serverCallbacks) {
    store = DS.Store.create({
      adapter: DS.Adapter.create(serverCallbacks)
    });

    store.loadMany(Person, array);

    recordArray = store.filter(Person, function(hash) {
      if (hash.get('name').match(/Scumbag/)) { return true; }
    });

    equal(get(recordArray, 'length'), 3, "The filter function should work");
  };

  test("a Record Array can update its filter after server-side updates one record", function() {
    setup({
      updateRecord: function(store, type, record) {
        store.didUpdateRecord(record, {id: 1, name: "Scumbag Server-side Dale"});
      }
    });

    clientEdits([1]);
    equal(get(recordArray, 'length'), 2, "The record array updates when the client changes records");

    serverResponds();
    equal(get(recordArray, 'length'), 3, "The record array updates when the server changes one record");
  });

  test("a Record Array can update its filter after server-side updates multiple records", function() {
    setup({
      updateRecords: function(store, type, records) {
        store.didUpdateRecords(records, [
          {id: 1, name: "Scumbag Server-side Dale"},
          {id: 2, name: "Scumbag Server-side Katz"}
        ]);
      }
    });

    clientEdits([1,2]);
    equal(get(recordArray, 'length'), 1, "The record array updates when the client changes records");

    serverResponds();
    equal(get(recordArray, 'length'), 3, "The record array updates when the server changes multiple records");
  });

  test("a Record Array can update its filter after server-side creates one record", function() {
    setup({
      createRecord: function(store, type, record) {
        store.didCreateRecord(record, {id: 4, name: "Scumbag Server-side Tim"});
      }
    });

    clientCreates(["Tim"]);
    equal(get(recordArray, 'length'), 3, "The record array does not include non-matching records");

    serverResponds();
    equal(get(recordArray, 'length'), 4, "The record array updates when the server creates a record");
  });

  test("a Record Array can update its filter after server-side creates multiple records", function() {
    setup({
      createRecords: function(store, type, records) {
        store.didCreateRecords(Person, records, [
          {id: 4, name: "Scumbag Server-side Mike"},
          {id: 5, name: "Scumbag Server-side David"}
        ]);
      }
    });

    clientCreates(["Mike", "David"]);
    equal(get(recordArray, 'length'), 3, "The record array does not include non-matching records");

    serverResponds();
    equal(get(recordArray, 'length'), 5, "The record array updates when the server creates multiple records");
  });
}());

test("an AdapterPopulatedRecordArray knows if it's loaded or not", function() {
  expect(2);

  var store = DS.Store.create({
    adapter: {
      findQuery: function(store, type, query, recordArray) {
        stop();

        setTimeout(function() {
          recordArray.load(array);
          equal(get(array, 'isLoaded'), true, "The array is now loaded");
          start();
        }, 100);
      }
    }
  });

  var array = store.find(Person, { page: 1 });

  equal(get(array, 'isLoaded'), false, "The array is not yet loaded");
});

test("a record array that backs a collection view functions properly", function() {

  var store = DS.Store.create();

  store.load(Person, 5, { name: "Other Katz" });

  var container = Ember.CollectionView.create({
    content: store.findAll(Person)
  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  function compareArrays() {
    var recordArray = container.content;
    var recordCache = recordArray.get('recordCache');
    var content = recordArray.get('content');
    for(var i = 0; i < content.length; i++) {
      var record = recordCache.objectAt(i);
      var clientId = content.objectAt(i);
      equal(record && record.clientId, clientId, "The entries in the record cache should have matching client ids.");
    }
  }

  compareArrays();

  store.load(Person, 6, { name: "Scumbag Demon" });

  compareArrays();

  store.load(Person, 7, { name: "Lord British" });

  compareArrays();

  container.destroy();

});

