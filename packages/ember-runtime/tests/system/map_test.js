var object, emberObject, number, string, map;

module("Ember.Map (forEach and get are implicitly tested)", {
  setup: function() {
    object = {};
    emberObject = Ember.Object.create();
    number = 42;
    string = "foo";

    map = Ember.Map.create();
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
  map.set(emberObject, "winning");
  map.set(number, "winning");
  map.set(string, "winning");

  mapHasEntries([
    [ object, "winning" ],
    [ emberObject, "winning" ],
    [ number, "winning" ],
    [ string, "winning" ]
  ]);

  map.set(object, "losing");
  map.set(emberObject, "losing");
  map.set(number, "losing");
  map.set(string, "losing");

  mapHasEntries([
    [ object, "losing" ],
    [ emberObject, "losing" ],
    [ number, "losing" ],
    [ string, "losing" ]
  ]);

  equal(map.has("nope"), false);
  equal(map.has({}), false);
});

test("remove", function() {
  map.set(object, "winning");
  map.set(emberObject, "winning");
  map.set(number, "winning");
  map.set(string, "winning");

  map.remove(object);
  map.remove(emberObject);
  map.remove(number);
  map.remove(string);

  // doesn't explode
  map.remove({});

  mapHasEntries([]);
});
