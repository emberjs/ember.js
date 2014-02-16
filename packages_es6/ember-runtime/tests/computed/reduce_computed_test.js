var map = Ember.EnumerableUtils.map,
    get = Ember.get,
    set = Ember.set,
    metaFor = Ember.meta,
    keys = Ember.keys,
    obj, addCalls, removeCalls, callbackItems;

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

test("multiple dependent keys can be specified via brace expansion", function() {
  var obj = Ember.Object.createWithMixins({
    bar: Ember.A(),
    baz: Ember.A(),
    foo: Ember.reduceComputed({
      initialValue: Ember.A(),
      addedItem: function(array, item) { array.pushObject('a:' + item); return array; },
      removedItem: function(array, item) { array.pushObject('r:' + item); return array; }
    }).property('{bar,baz}')
  });

  deepEqual(get(obj, 'foo'), [], "initially empty");

  get(obj, 'bar').pushObject(1);

  deepEqual(get(obj, 'foo'), ['a:1'], "added item from brace-expanded dependency");

  get(obj, 'baz').pushObject(2);

  deepEqual(get(obj, 'foo'), ['a:1', 'a:2'], "added item from brace-expanded dependency");

  get(obj, 'bar').popObject();

  deepEqual(get(obj, 'foo'), ['a:1', 'a:2', 'r:1'], "removed item from brace-expanded dependency");

  get(obj, 'baz').popObject();

  deepEqual(get(obj, 'foo'), ['a:1', 'a:2', 'r:1', 'r:2'], "removed item from brace-expanded dependency");
});

  test("multiple item property keys can be specified via brace expansion", function() {
    var addedCalls = 0,
        removedCalls = 0,
        expected = Ember.A(),
        item = { propA: 'A', propB: 'B', propC: 'C' },
        obj = Ember.Object.createWithMixins({
          bar: Ember.A([item]),
          foo: Ember.reduceComputed({
            initialValue: Ember.A(),
            addedItem: function(array, item, changeMeta) {
              array.pushObject('a:' + get(item, 'propA') + ':' + get(item, 'propB') + ':' + get(item, 'propC'));
              return array;
            },
            removedItem: function(array, item, changeMeta) {
              array.pushObject('r:' + get(item, 'propA') + ':' + get(item, 'propB') + ':' + get(item, 'propC'));
              return array;
            }
          }).property('bar.@each.{propA,propB}')
        });

    expected.pushObjects(['a:A:B:C']);
    deepEqual(get(obj, 'foo'), expected, "initially added dependent item");

    set(item, 'propA', 'AA');

    expected.pushObjects(['r:AA:B:C', 'a:AA:B:C']);
    deepEqual(get(obj, 'foo'), expected, "observing item property key specified via brace expansion");

    set(item, 'propB', 'BB');

    expected.pushObjects(['r:AA:BB:C', 'a:AA:BB:C']);
    deepEqual(get(obj, 'foo'), expected, "observing item property key specified via brace expansion");

    set(item, 'propC', 'CC');

    deepEqual(get(obj, 'foo'), expected, "not observing unspecified item properties");
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

test("dependent arrays with multiple item properties are not double-counted", function() {
  var obj = Ember.Object.extend({
    items: Ember.A([{ foo: true }, { bar: false }, { bar: true }]),
    countFooOrBar: Ember.reduceComputed({
      initialValue: 0,
      addedItem: function (acc) {
        ++addCalls;
        return acc;
      },

      removedItem: function (acc) {
        ++removeCalls;
        return acc;
      }
    }).property('items.@each.foo', 'items.@each.bar', 'items')
  }).create();

  equal(0, addCalls, "precond - no adds yet");
  equal(0, removeCalls, "precond - no removes yet");

  get(obj, 'countFooOrBar');

  equal(3, addCalls, "all items added once");
  equal(0, removeCalls, "no removes yet");
});

test("dependent arrays can use `replace` with an out of bounds index to add items", function() {
  var dependentArray = Ember.A(),
      array;

  obj = Ember.Object.extend({
    dependentArray: dependentArray,
    computed: Ember.arrayComputed('dependentArray', {
      addedItem: function (acc, item, changeMeta) {
        acc.insertAt(changeMeta.index, item);
        return acc;
      },
      removedItem: function (acc) { return acc; }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], "precond - computed array is initially empty");

  dependentArray.replace(100, 0, [1, 2]);

  deepEqual(array, [1, 2], "index >= length treated as a push");

  dependentArray.replace(-100, 0, [3, 4]);

  deepEqual(array, [3, 4, 1, 2], "index < 0 treated as an unshift");
});

test("dependent arrays can use `replace` with a negative index to remove items indexed from the right", function() {
  var dependentArray = Ember.A([1,2,3,4,5]),
      array;

  obj = Ember.Object.extend({
    dependentArray: dependentArray,
    computed: Ember.arrayComputed('dependentArray', {
      addedItem: function (acc, item) { return acc; },
      removedItem: function (acc, item) { acc.pushObject(item); return acc; }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], "precond - no items have been removed initially");

  dependentArray.replace(-3, 2);

  deepEqual(array, [4,3], "index < 0 used as a right index for removal");
});

test("dependent arrays that call `replace` with an out of bounds index to remove items is a no-op", function() {
  var dependentArray = Ember.A([1, 2]),
      array;

  obj = Ember.Object.extend({
    dependentArray: dependentArray,
    computed: Ember.arrayComputed('dependentArray', {
      addedItem: function (acc, item, changeMeta) { return acc; },
      removedItem: function (acc) {
        ok(false, "no items have been removed");
      }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], "precond - computed array is initially empty");

  dependentArray.replace(100, 2);
});

test("dependent arrays that call `replace` with a too-large removedCount a) works and b) still right-truncates", function() {
  var dependentArray = Ember.A([1, 2]),
      array;

  obj = Ember.Object.extend({
    dependentArray: dependentArray,
    computed: Ember.arrayComputed('dependentArray', {
      addedItem: function (acc, item) { return acc; },
      removedItem: function (acc, item) { acc.pushObject(item); return acc; }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], "precond - computed array is initially empty");

  dependentArray.replace(1, 200);

  deepEqual(array, [2], "array was correctly right-truncated");
});

test("removedItem is not erroneously called for dependent arrays during a recomputation", function() {
  function addedItem(array, item, changeMeta) {
    array.insertAt(changeMeta.index, item);
    return array;
  }

  function removedItem(array, item, changeMeta) {
    ok(get(array, 'length') > changeMeta.index, "removedItem not called with invalid index");
    array.removeAt(changeMeta.index, 1);
    return array;
  }

  var dependentArray = Ember.A(),
      options = {
        addedItem: addedItem,
        removedItem: removedItem
      };

  obj = Ember.Object.extend({
    dependentArray: Ember.A([1, 2]),
    identity0: Ember.arrayComputed('dependentArray', options),
    identity1: Ember.arrayComputed('identity0', options)
  }).create();

  get(obj, 'identity1');
  Ember.run(function() {
    obj.notifyPropertyChange('dependentArray');
  });

  ok(true, "removedItem not invoked with invalid index");
});

module('Ember.arrayComputed - recomputation DKs', {
  setup: function() {
    obj = Ember.Object.extend({
      people: Ember.A([{
        name: 'Jaime Lannister',
        title: 'Kingsguard'
      }, {
        name: 'Cersei Lannister',
        title: 'Queen'
      }]),

      titles: Ember.arrayComputed('people', {
        addedItem: function (acc, person) {
          acc.pushObject(get(person, 'title'));
          return acc;
        }
      })
    }).create();
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("recomputations from `arrayComputed` observers add back dependent keys", function() {
  var meta = metaFor(obj),
      people = get(obj, 'people'),
      titles;

  equal(meta.deps, undefined, "precond - nobody depends on people'");
  equal(meta.watching.people, undefined, "precond - nobody is watching people");

  titles = get(obj, 'titles');

  deepEqual(titles, ["Kingsguard", "Queen"], "precond - value is correct");

  ok(meta.deps.people !== undefined, "people has dependencies");
  deepEqual(keys(meta.deps.people), ["titles"], "only titles depends on people");
  equal(meta.deps.people.titles, 1, "titles depends on people exactly once");
  equal(meta.watching.people, 2, "people has two watchers: the array listener and titles");

  Ember.run(function() {
    set(obj, 'people', Ember.A());
  });

  // Regular CPs are invalidated when their dependent keys change, but array
  // computeds keep refs up to date
  deepEqual(titles, [], "value is correct");
  equal(meta.cache.titles, titles, "value remains cached");
  ok(meta.deps.people !== undefined, "people has dependencies");
  deepEqual(keys(meta.deps.people), ["titles"], "meta.deps.people is unchanged");
  equal(meta.deps.people.titles, 1, "deps.people.titles is unchanged");
  equal(meta.watching.people, 2, "watching.people is unchanged");
});

module('Ember.arryComputed - self chains', {
  setup: function() {
    var a = Ember.Object.create({ name: 'a' }),
    b = Ember.Object.create({ name: 'b' });

    obj = Ember.ArrayProxy.createWithMixins({
      content: Ember.A([a, b]),
      names: Ember.arrayComputed('@this.@each.name', {
        addedItem: function (array, item, changeMeta, instanceMeta) {
          var mapped = get(item, 'name');
          array.insertAt(changeMeta.index, mapped);
          return array;
        },
        removedItem: function(array, item, changeMeta, instanceMeta) {
          array.removeAt(changeMeta.index, 1);
          return array;
        }
      })
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("@this can be used to treat the object as the array itself", function() {
  var names = get(obj, 'names');

  deepEqual(names, ['a', 'b'], "precond - names is initially correct");

  Ember.run(function() {
    obj.objectAt(1).set('name', 'c');
  });

  deepEqual(names, ['a', 'c'], "@this can be used with item property observers");

  Ember.run(function() {
    obj.pushObject({ name: 'd' });
  });

  deepEqual(names, ['a', 'c', 'd'], "@this observes new items");
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

module('Ember.arrayComputed - completely invalidating dependencies', {
  setup: function () {
    addCalls = removeCalls = 0;
  }
});

test("non-array dependencies completely invalidate a reduceComputed CP", function() {
  var dependentArray = Ember.A();

  obj = Ember.Object.extend({
    nonArray: 'v0',
    dependentArray: dependentArray,

    computed: Ember.arrayComputed('dependentArray', 'nonArray', {
      addedItem: function (array) {
        ++addCalls;
        return array;
      },

      removedItem: function (array) {
        --removeCalls;
        return array;
      }
    })
  }).create();

  get(obj, 'computed');

  equal(addCalls, 0, "precond - add has not initially been called");
  equal(removeCalls, 0, "precond - remove has not initially been called");

  dependentArray.pushObjects([1, 2]);

  equal(addCalls, 2, "add called one-at-a-time for dependent array changes");
  equal(removeCalls, 0, "remove not called");

  Ember.run(function() {
    set(obj, 'nonArray', 'v1');
  });

  equal(addCalls, 4, "array completely recomputed when non-array dependency changed");
  equal(removeCalls, 0, "remove not called");
});

test("array dependencies specified with `.[]` completely invalidate a reduceComputed CP", function() {
  var dependentArray = Ember.A(),
  totallyInvalidatingDependentArray = Ember.A();

  obj = Ember.Object.extend({
    totallyInvalidatingDependentArray: totallyInvalidatingDependentArray,
    dependentArray: dependentArray,

    computed: Ember.arrayComputed('dependentArray', 'totallyInvalidatingDependentArray.[]', {
      addedItem: function (array, item) {
        ok(item !== 3, "totally invalidating items are never passed to the one-at-a-time callbacks");
        ++addCalls;
        return array;
      },

      removedItem: function (array, item) {
        ok(item !== 3, "totally invalidating items are never passed to the one-at-a-time callbacks");
        --removeCalls;
        return array;
      }
    })
  }).create();

  get(obj, 'computed');

  equal(addCalls, 0, "precond - add has not initially been called");
  equal(removeCalls, 0, "precond - remove has not initially been called");

  dependentArray.pushObjects([1, 2]);

  equal(addCalls, 2, "add called one-at-a-time for dependent array changes");
  equal(removeCalls, 0, "remove not called");

  Ember.run(function() {
    totallyInvalidatingDependentArray.pushObject(3);
  });

  equal(addCalls, 4, "array completely recomputed when totally invalidating dependent array modified");
  equal(removeCalls, 0, "remove not called");
});

test("returning undefined in addedItem/removedItem completely invalidates a reduceComputed CP", function() {
  var dependentArray = Ember.A([3,2,1]),
      counter = 0;

  obj = Ember.Object.extend({
    dependentArray: dependentArray,

    computed: Ember.reduceComputed('dependentArray', {
      initialValue: Infinity,

      addedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
        return Math.min(accumulatedValue, item);
      },

      removedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
        if (item > accumulatedValue) {
          return accumulatedValue;
        }
      }
    }),

    computedDidChange: Ember.observer('computed', function() {
      counter++;
    })
  }).create();

  get(obj, 'computed');
  equal(get(obj, 'computed'), 1);
  equal(counter, 0);

  dependentArray.pushObject(10);
  equal(get(obj, 'computed'), 1);
  equal(counter, 0);

  dependentArray.removeObject(10);
  equal(get(obj, 'computed'), 1);
  equal(counter, 0);

  dependentArray.removeObject(1);
  equal(get(obj, 'computed'), 2);
  equal(counter, 1);
});

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.Array) {
  test("reduceComputed complains about array dependencies that are not `Ember.Array`s", function() {
    var Type = Ember.Object.extend({
      rc: Ember.reduceComputed('array', {
        initialValue: 0,
        addedItem: function(v){ return v; },
        removedItem: function(v){ return v; }
      })
    });

    expectAssertion(function() {
      obj = Type.create({ array: [] });
      get(obj, 'rc');
    }, /must be an `Ember.Array`/, "Ember.reduceComputed complains about dependent non-extended native arrays");
  });
}
