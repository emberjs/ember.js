var object, number, string, map;

var varieties = ['Map', 'MapWithDefault'], variety;

function testMap(variety) {
  module("Ember." + variety + " (forEach and get are implicitly tested)", {
    setup: function() {
      object = {};
      number = 42;
      string = "foo";

      map = Ember[variety].create();
    }
  });

  var mapHasLength = function(expected, theMap) {
    theMap = theMap || map;

    var length = 0;
    theMap.forEach(function() {
      length++;
    });

    equal(length, expected, "map should contain " + expected + " items");
  };

  var mapHasEntries = function(entries, theMap) {
    theMap = theMap || map;

    for (var i = 0, l = entries.length; i < l; i++) {
      equal(theMap.get(entries[i][0]), entries[i][1]);
      equal(theMap.has(entries[i][0]), true);
    }

    mapHasLength(entries.length, theMap);
  };

  test("add", function() {
    map.set(object, "winning");
    map.set(number, "winning");
    map.set(string, "winning");

    mapHasEntries([
      [ object, "winning" ],
      [ number, "winning" ],
      [ string, "winning" ]
    ]);

    map.set(object, "losing");
    map.set(number, "losing");
    map.set(string, "losing");

    mapHasEntries([
      [ object, "losing" ],
      [ number, "losing" ],
      [ string, "losing" ]
    ]);

    equal(map.has("nope"), false);
    equal(map.has({}), false);
  });

  test("remove", function() {
    map.set(object, "winning");
    map.set(number, "winning");
    map.set(string, "winning");

    map.remove(object);
    map.remove(number);
    map.remove(string);

    // doesn't explode
    map.remove({});

    mapHasEntries([]);
  });

  test("copy and then update", function() {
    map.set(object, "winning");
    map.set(number, "winning");
    map.set(string, "winning");

    var map2 = map.copy();

    map2.set(object, "losing");
    map2.set(number, "losing");
    map2.set(string, "losing");

    mapHasEntries([
      [ object, "winning" ],
      [ number, "winning" ],
      [ string, "winning" ]
    ]);

    mapHasEntries([
      [ object, "losing" ],
      [ number, "losing" ],
      [ string, "losing" ]
    ], map2);
  });

  test("copy and then remove", function() {
    map.set(object, "winning");
    map.set(number, "winning");
    map.set(string, "winning");

    var map2 = map.copy();

    map2.remove(object);
    map2.remove(number);
    map2.remove(string);

    mapHasEntries([
      [ object, "winning" ],
      [ number, "winning" ],
      [ string, "winning" ]
    ]);

    mapHasEntries([ ], map2);
  });
    
  test("length", function() {
    //Add a key twice
    equal(map.length, 0);
    map.set(string, "a string");
    equal(map.length, 1);
    map.set(string, "the same string");
    equal(map.length, 1);
    
    //Add another
    map.set(number, "a number");
    equal(map.length, 2);
    
    //Remove one that doesn't exist
    map.remove('does not exist');
    equal(map.length, 2);
    
    //Check copy
    var copy = map.copy();
    equal(copy.length, 2);
    
    //Remove a key twice
    map.remove(number);
    equal(map.length, 1);
    map.remove(number);
    equal(map.length, 1);
    
    //Remove the last key
    map.remove(string);
    equal(map.length, 0);
    map.remove(string);
    equal(map.length, 0);
  });
}

for (var i = 0;  i < varieties.length;  i++) {
  testMap(varieties[i]);
}

module("MapWithDefault - default values");

test("Retrieving a value that has not been set returns and sets a default value", function() {
  var map = Ember.MapWithDefault.create({
    defaultValue: function(key) {
      return [key];
    }
  });

  var value = map.get('ohai');
  deepEqual(value, [ 'ohai' ]);

  strictEqual(value, map.get('ohai'));
});

test("Copying a MapWithDefault copies the default value", function() {
  var map = Ember.MapWithDefault.create({
    defaultValue: function(key) {
      return [key];
    }
  });

  map.set('ohai', 1);
  map.get('bai');

  var map2 = map.copy();

  equal(map2.get('ohai'), 1);
  deepEqual(map2.get('bai'), ['bai']);

  map2.set('kthx', 3);

  deepEqual(map.get('kthx'), ['kthx']);
  equal(map2.get('kthx'), 3);

  deepEqual(map2.get('default'), ['default']);

  map2.defaultValue = function(key) {
    return ['tom is on', key];
  };

  deepEqual(map2.get('drugs'), ['tom is on', 'drugs']);
});
