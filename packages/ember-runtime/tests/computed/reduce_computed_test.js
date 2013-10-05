var obj, addCalls, removeCalls, map = Ember.EnumerableUtils.map, get = Ember.get, set = Ember.set, callbackItems;

module('Ember.arrayComputed', {
  setup: function () {
    addCalls = removeCalls = 0;

    obj = Ember.Object.createWithMixins({
      numbers:  Ember.A([ 1, 2, 3, 4, 5, 6 ]),
      otherNumbers: Ember.A([ 7, 8, 9 ]),

      // Users would obviously just use `Ember.computed.map`
      // This implemantion is fine for these tests, but doesn't properly work as
      // it's not index based.
      evenNumbers: Ember.arrayComputed('numbers', {
        addedItem: function (array, item) {
          addCalls++;
          if (item % 2 === 0) {
            array.pushObject(item);
          }
          return array;
        },
        removedItem: function (array, item) {
          removeCalls++;
          array.removeObject(item);
          return array;
        }
      }),

      evenNumbersMultiDep: Ember.arrayComputed('numbers', 'otherNumbers', {
        addedItem: function (array, item) {
          if (item % 2 === 0) {
            array.pushObject(item);
          }
          return array;
        }
      }),

      nestedNumbers:  Ember.A(map([1,2,3,4,5,6], function (n) {
                        return Ember.Object.create({ p: 'otherProperty', v: n });
                      })),

      evenNestedNumbers: Ember.arrayComputed({
        addedItem: function (array, item, keyName) {
          var value = item.get('v');
          if (value % 2 === 0) {
            array.pushObject(value);
          }
          return array;
        },
        removedItem: function (array, item, keyName) {
          array.removeObject(item.get('v'));
          return array;
        }
      }).property('nestedNumbers.@each.v')
    });
  },

  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});


test("array computed properties are instances of Ember.ComputedProperty", function() {
  ok(Ember.arrayComputed({}) instanceof Ember.ComputedProperty);
});

test("when the dependent array is null or undefined, `addedItem` is not called and only the initial value is returned", function() {
  obj = Ember.Object.createWithMixins({
    numbers: null,
    doubledNumbers: Ember.arrayComputed('numbers', {
      addedItem: function (array, n) {
        addCalls++;
        array.pushObject(n * 2);
        return array;
      }
    })
  });

  deepEqual(get(obj, 'doubledNumbers'), [], "When the dependent array is null, the initial value is returned");
  equal(addCalls, 0,  "`addedItem` is not called when the dependent array is null");

  Ember.run(function() {
    set(obj, 'numbers', Ember.A([1,2]));
  });

  deepEqual(get(obj, 'doubledNumbers'), [2,4], "An initially null dependent array can still be set later");
  equal(addCalls, 2, "`addedItem` is called when the dependent array is initially set");
});

test("on first retrieval, array computed properties are computed", function() {
  deepEqual(get(obj, 'evenNumbers'), [2,4,6], "array computed properties are correct on first invocation");
});

test("on first retrieval, array computed properties with multiple dependent keys are computed", function() {
  deepEqual(get(obj, 'evenNumbersMultiDep'), [2, 4, 6, 8], "array computed properties are correct on first invocation");
});

test("on first retrieval, array computed properties dependent on nested objects are computed", function() {
  deepEqual(get(obj, 'evenNestedNumbers'), [2,4,6], "array computed properties are correct on first invocation");
});

test("after the first retrieval, array computed properties observe additions to dependent arrays", function() {
  var numbers = get(obj, 'numbers'),
      // set up observers
      evenNumbers = get(obj, 'evenNumbers');

  Ember.run(function() {
    numbers.pushObjects([7, 8]);
  });

  deepEqual(evenNumbers, [2, 4, 6, 8], "array computed properties watch dependent arrays");
});

test("after the first retrieval, array computed properties observe removals from dependent arrays", function() {
  var numbers = get(obj, 'numbers'),
      // set up observers
      evenNumbers = get(obj, 'evenNumbers');

  Ember.run(function() {
    numbers.removeObjects([3, 4]);
  });

  deepEqual(evenNumbers, [2, 6], "array computed properties watch dependent arrays");
});

test("after first retrieval, array computed properties can observe properties on array items", function() {
  var nestedNumbers = get(obj, 'nestedNumbers'),
      evenNestedNumbers = get(obj, 'evenNestedNumbers');

  deepEqual(evenNestedNumbers, [2, 4, 6], 'precond -- starts off with correct values');

  Ember.run(function() {
    nestedNumbers.objectAt(0).set('v', 22);
  });

  deepEqual(nestedNumbers.mapBy('v'), [22, 2, 3, 4, 5, 6], 'nested numbers is updated');
  deepEqual(evenNestedNumbers, [2, 4, 6, 22], 'adds new number');
});

test("changes to array computed properties happen synchronously", function() {
  var nestedNumbers = get(obj, 'nestedNumbers'),
      evenNestedNumbers = get(obj, 'evenNestedNumbers');

  deepEqual(evenNestedNumbers, [2, 4, 6], 'precond -- starts off with correct values');

  Ember.run(function() {
    nestedNumbers.objectAt(0).set('v', 22);
    deepEqual(nestedNumbers.mapBy('v'), [22, 2, 3, 4, 5, 6], 'nested numbers is updated');
    deepEqual(evenNestedNumbers, [2, 4, 6, 22], 'adds new number');
  });
});

test("doubly nested item property keys (@each.foo.@each) are not supported", function() {
  Ember.run(function() {
    obj = Ember.Object.createWithMixins({
      peopleByOrdinalPosition: Ember.A([{ first: Ember.A([Ember.Object.create({ name: "Jaime Lannister" })])}]),
      people: Ember.arrayComputed({
        addedItem: function (array, item) {
          array.pushObject(get(item, 'first.firstObject'));
          return array;
        }
      }).property('peopleByOrdinalPosition.@each.first'),
      names: Ember.arrayComputed({
        addedItem: function (array, item) {
          equal(get(item, 'name'), 'Jaime Lannister');
          array.pushObject(item.get('name'));
          return array;
        }
      }).property('people.@each.name')
    });
  });

  equal(obj.get('names.firstObject'), 'Jaime Lannister', "Doubly nested item properties can be retrieved manually");

  throws(function() {
    obj = Ember.Object.createWithMixins({
      people: [{ first: Ember.A([Ember.Object.create({ name: "Jaime Lannister" })])}],
      names: Ember.arrayComputed({
        addedItem: function (array, item) {
          array.pushObject(item);
          return array;
        }
      }).property('people.@each.first.@each.name')
    });
  }, /Nested @each/, "doubly nested item property keys are not supported");
});

test("after the first retrieval, array computed properties observe dependent arrays", function() {
  var numbers = get(obj, 'numbers'),
      evenNumbers = get(obj, 'evenNumbers');

  deepEqual(evenNumbers, [2, 4, 6], 'precond -- starts off with correct values');

  Ember.run(function() {
    set(obj, 'numbers', Ember.A([20, 23, 28]));
  });

  deepEqual(evenNumbers, [20, 28], "array computed properties watch dependent arrays");
});

test("array observers are torn down when dependent arrays change", function() {
  var numbers = get(obj, 'numbers'),
      evenNumbers = get(obj, 'evenNumbers');

  equal(addCalls, 6, 'precond - add has been called for each item in the array');
  equal(removeCalls, 0, 'precond - removed has not been called');

  Ember.run(function() {
    set(obj, 'numbers', Ember.A([20, 23, 28]));
  });

  equal(addCalls, 9, 'add is called for each item in the new array');
  equal(removeCalls, 0, 'remove is not called when the array is reset');

  numbers.replace(0, numbers.get('length'), Ember.A([7,8,9,10]));

  equal(addCalls, 9, 'add is not called');
  equal(removeCalls, 0, 'remove is not called');
});

test("modifying properties on dependent array items triggers observers exactly once", function() {
  var numbers = get(obj, 'numbers'),
      evenNumbers = get(obj, 'evenNumbers');

  equal(addCalls, 6, 'precond - add has not been called for each item in the array');
  equal(removeCalls, 0, 'precond - removed has not been called');

  Ember.run(function() {
    numbers.replace(0,2,[7,8,9,10]);
  });

  equal(addCalls, 10, 'add is called for each item added');
  equal(removeCalls, 2, 'removed is called for each item removed');
  deepEqual(evenNumbers, [4,6,8,10], 'sanity check - dependent arrays are updated');
});

test("multiple array computed properties on the same object can observe dependent arrays", function() {
  var numbers = get(obj, 'numbers'),
      otherNumbers = get(obj, 'otherNumbers');

  deepEqual(get(obj, 'evenNumbers'), [2,4,6], "precond - evenNumbers is initially correct");
  deepEqual(get(obj, 'evenNumbersMultiDep'), [2, 4, 6, 8], "precond - evenNumbersMultiDep is initially correct");

  Ember.run(function() {
    numbers.pushObject(12);
    otherNumbers.pushObject(14);
  });

  deepEqual(get(obj, 'evenNumbers'), [2,4,6,12], "evenNumbers is updated");
  deepEqual(get(obj, 'evenNumbersMultiDep'), [2, 4, 6, 8, 12, 14], "evenNumbersMultiDep is updated");
});

module('Ember.arrayComputed - changeMeta property observers', {
  setup: function() {
    callbackItems = [];
    Ember.run(function() {
      obj = Ember.Object.createWithMixins({
        items: Ember.A([Ember.Object.create({ n: 'zero' }), Ember.Object.create({ n: 'one' })]),
        itemsN: Ember.arrayComputed('items.@each.n', {
          addedItem: function (array, item, changeMeta, instanceMeta) {
            callbackItems.push('add:' + changeMeta.index + ":" + get(changeMeta.item, 'n'));
          },
          removedItem: function (array, item, changeMeta, instanceMeta) {
            callbackItems.push('remove:' + changeMeta.index + ":" + get(changeMeta.item, 'n'));
          }
        })
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("changeMeta includes item and index", function() {
  var expected, items, item;

  items = get(obj, 'items');

  // initial computation add0 add1
  Ember.run(function() {
    obj.get('itemsN');
  });

  // add2
  Ember.run(function() {
    items.pushObject(Ember.Object.create({ n: 'two' }));
  });

  // remove2
  Ember.run(function() {
    items.popObject();
  });

  // remove0 add0
  Ember.run(function() {
    set(get(items, 'firstObject'), 'n', "zero'");
  });

  expected = ["add:0:zero", "add:1:one", "add:2:two", "remove:2:two", "remove:0:zero'", "add:0:zero'"];
  deepEqual(callbackItems, expected, "changeMeta includes items");

  // [zero', one] -> [zero', one, five, six]
  // add2 add3
  Ember.run(function() {
    items.pushObject(Ember.Object.create({ n: 'five' }));
    items.pushObject(Ember.Object.create({ n: 'six' }));
  });

  // remove0 add0
  Ember.run(function() {
    items.objectAt(0).set('n', "zero''");
  });

  expected = expected.concat(['add:2:five', 'add:3:six', "remove:0:zero''", "add:0:zero''"]);
  deepEqual(callbackItems, expected, "changeMeta includes items");

  // [zero'', one, five, six] -> [zero'', five, six]
  // remove1
  Ember.run(function() {
    item = items.objectAt(1);
    items.removeAt(1, 1);
  });

  Ember.run(function() {
    // observer should have been removed from the deleted item
    item.set('n', 'ten thousand');
  });

  // [zero'', five, six] -> [zero'', five, seven]
  // remove2 add2
  Ember.run(function() {
    items.objectAt(2).set('n', "seven");
  });

  // observer should have been added to the new item
  expected = expected.concat(['remove:1:one', 'remove:2:seven', 'add:2:seven']);
  deepEqual(callbackItems, expected, "changeMeta includes items");

  // reset (does not call remove)
  Ember.run(function() {
    item = items.objectAt(1);
    set(obj, 'items', Ember.A([]));
  });

  Ember.run(function() {
    // observers should have been removed from the items in the old array
    set(item, 'n', 'eleven thousand');
  });

  deepEqual(callbackItems, expected, "items removed from the array had observers removed");
});

test("when initialValue is undefined, everything works as advertised", function() {
  var chars = Ember.Object.createWithMixins({
    letters: Ember.A(),
    firstUpper: Ember.reduceComputed('letters', {
      initialValue: undefined,

      initialize: function(initialValue, changeMeta, instanceMeta) {
        instanceMeta.matchingItems = Ember.A();
        instanceMeta.subArray = new Ember.SubArray();
        instanceMeta.firstMatch = function() {
          return Ember.getWithDefault(instanceMeta.matchingItems, 'firstObject', initialValue);
        };
      },

      addedItem: function(accumulatedValue,item,changeMeta,instanceMeta) {
        var filterIndex;
        filterIndex = instanceMeta.subArray.addItem(changeMeta.index, item.toUpperCase() === item);
        if (filterIndex > -1) {
          instanceMeta.matchingItems.insertAt(filterIndex, item);
        }
        return instanceMeta.firstMatch();
      },

      removedItem: function(accumulatedValue,item,changeMeta,instanceMeta) {
        var filterIndex = instanceMeta.subArray.removeItem(changeMeta.index);
        if (filterIndex > -1) {
          instanceMeta.matchingItems.removeAt(filterIndex);
        }
        return instanceMeta.firstMatch();
      }
    })
  });
  equal(get(chars, 'firstUpper'), undefined, "initialValue is undefined");

  get(chars, 'letters').pushObjects(['a', 'b', 'c']);

  equal(get(chars, 'firstUpper'), undefined, "result is undefined when no matches are present");

  get(chars, 'letters').pushObjects(['A', 'B', 'C']);

  equal(get(chars, 'firstUpper'), 'A', "result is the first match when matching objects are present");

  get(chars, 'letters').removeAt(3);

  equal(get(chars, 'firstUpper'), 'B', "result is the next match when the first matching object is removed");
});

test("an error is thrown when a reduceComputed is defined without an initialValue property", function() {
  var defineExploder = function() {
    Ember.Object.createWithMixins({
      collection: Ember.A(),
      exploder: Ember.reduceComputed('collection', {
        initialize: function(initialValue, changeMeta, instanceMeta) {},

        addedItem: function(accumulatedValue,item,changeMeta,instanceMeta) {
          return item;
        },

        removedItem: function(accumulatedValue,item,changeMeta,instanceMeta) {
          return item;
        }
      })
    });
  };

  throws(defineExploder, /declared\ without\ an\ initial\ value/, "an error is thrown when the reduceComputed is defined without an initialValue");
});
