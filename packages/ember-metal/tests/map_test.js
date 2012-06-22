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

  var mapHasLength = function(expected) {
    var length = 0;
    map.forEach(function() {
      length++;
    });

    equal(length, expected, "map should contain " + expected + " items");
  };

  var mapHasEntries = function(entries) {
    for (var i = 0, l = entries.length; i < l; i++) {
      equal(map.get(entries[i][0]), entries[i][1]);
      equal(map.has(entries[i][0]), true);
    }

    mapHasLength(entries.length);
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
