import Ember from 'ember-metal/core';
import {
  get,
  getWithDefault
} from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { meta as metaFor } from 'ember-metal/utils';
import run from 'ember-metal/run_loop';
import { observer } from 'ember-metal/mixin';
import keys from 'ember-metal/keys';
import EmberObject from 'ember-runtime/system/object';
import {
  ComputedProperty,
  computed
} from 'ember-metal/computed';
import { arrayComputed } from 'ember-runtime/computed/array_computed';
import { reduceComputed } from 'ember-runtime/computed/reduce_computed';
import ArrayProxy from 'ember-runtime/system/array_proxy';
import SubArray from 'ember-runtime/system/subarray';

var obj, addCalls, removeCalls, callbackItems, shared;

QUnit.module('arrayComputed - [DEPRECATED]', {
  setup() {
    addCalls = removeCalls = 0;

    expectDeprecation(function() {

      obj = EmberObject.createWithMixins({
        numbers:  Ember.A([1, 2, 3, 4, 5, 6]),
        otherNumbers: Ember.A([7, 8, 9]),

        // Users would obviously just use `Ember.computed.map`
        // This implementation is fine for these tests, but doesn't properly work as
        // it's not index based.
        evenNumbers: arrayComputed('numbers', {
          addedItem(array, item) {
            addCalls++;
            if (item % 2 === 0) {
              array.pushObject(item);
            }
            return array;
          },
          removedItem(array, item) {
            removeCalls++;
            array.removeObject(item);
            return array;
          }
        }),

        evenNumbersMultiDep: arrayComputed('numbers', 'otherNumbers', {
          addedItem(array, item) {
            if (item % 2 === 0) {
              array.pushObject(item);
            }
            return array;
          }
        }),

        nestedNumbers:  Ember.A([1,2,3,4,5,6].map((n) => {
          return EmberObject.create({ p: 'otherProperty', v: n });
        })),

        evenNestedNumbers: arrayComputed({
          addedItem(array, item, keyName) {
            var value = item.get('v');
            if (value % 2 === 0) {
              array.pushObject(value);
            }
            return array;
          },
          removedItem(array, item, keyName) {
            array.removeObject(item.get('v'));
            return array;
          }
        }).property('nestedNumbers.@each.v')
      });

    }, 'Ember.arrayComputed is deprecated. Replace it with plain array methods');

  },

  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test('reduceComputed is deprecated', function() {
  expectDeprecation(/Ember.reduceComputed is deprecated/);
  reduceComputed({ initialValue: 0 });
});

QUnit.test('arrayComputed is deprecated', function() {
  expectDeprecation(/Ember.arrayComputed is deprecated/);
  arrayComputed({});
});

QUnit.test('array computed properties are instances of ComputedProperty', function() {
  expectDeprecation(/Ember.arrayComputed is deprecated/);

  ok(arrayComputed({}) instanceof ComputedProperty);
});

QUnit.test('when the dependent array is null or undefined, `addedItem` is not called and only the initial value is returned', function() {
  expectDeprecation(/Ember.arrayComputed is deprecated/);

  obj = EmberObject.createWithMixins({
    numbers: null,
    doubledNumbers: arrayComputed('numbers', {
      addedItem(array, n) {
        addCalls++;
        array.pushObject(n * 2);
        return array;
      }
    })
  });

  deepEqual(get(obj, 'doubledNumbers'), [], 'When the dependent array is null, the initial value is returned');
  equal(addCalls, 0, '`addedItem` is not called when the dependent array is null');

  run(function() {
    set(obj, 'numbers', Ember.A([1,2]));
  });

  deepEqual(get(obj, 'doubledNumbers'), [2,4], 'An initially null dependent array can still be set later');
  equal(addCalls, 2, '`addedItem` is called when the dependent array is initially set');
});

QUnit.test('on first retrieval, array computed properties are computed', function() {
  deepEqual(get(obj, 'evenNumbers'), [2,4,6], 'array computed properties are correct on first invocation');
});

QUnit.test('on first retrieval, array computed properties with multiple dependent keys are computed', function() {
  deepEqual(get(obj, 'evenNumbersMultiDep'), [2, 4, 6, 8], 'array computed properties are correct on first invocation');
});

QUnit.test('on first retrieval, array computed properties dependent on nested objects are computed', function() {
  deepEqual(get(obj, 'evenNestedNumbers'), [2,4,6], 'array computed properties are correct on first invocation');
});

QUnit.test('after the first retrieval, array computed properties observe additions to dependent arrays', function() {
  var numbers = get(obj, 'numbers');
  // set up observers
  var evenNumbers = get(obj, 'evenNumbers');

  run(function() {
    numbers.pushObjects([7, 8]);
  });

  deepEqual(evenNumbers, [2, 4, 6, 8], 'array computed properties watch dependent arrays');
});

QUnit.test('after the first retrieval, array computed properties observe removals from dependent arrays', function() {
  var numbers = get(obj, 'numbers');
  // set up observers
  var evenNumbers = get(obj, 'evenNumbers');

  run(function() {
    numbers.removeObjects([3, 4]);
  });

  deepEqual(evenNumbers, [2, 6], 'array computed properties watch dependent arrays');
});

QUnit.test('after first retrieval, array computed properties can observe properties on array items', function() {
  var nestedNumbers = get(obj, 'nestedNumbers');
  var evenNestedNumbers = get(obj, 'evenNestedNumbers');

  deepEqual(evenNestedNumbers, [2, 4, 6], 'precond -- starts off with correct values');

  run(function() {
    nestedNumbers.objectAt(0).set('v', 22);
  });

  deepEqual(nestedNumbers.mapBy('v'), [22, 2, 3, 4, 5, 6], 'nested numbers is updated');
  deepEqual(evenNestedNumbers, [2, 4, 6, 22], 'adds new number');
});

QUnit.test('changes to array computed properties happen synchronously', function() {
  var nestedNumbers = get(obj, 'nestedNumbers');
  var evenNestedNumbers = get(obj, 'evenNestedNumbers');

  deepEqual(evenNestedNumbers, [2, 4, 6], 'precond -- starts off with correct values');

  run(function() {
    nestedNumbers.objectAt(0).set('v', 22);
    deepEqual(nestedNumbers.mapBy('v'), [22, 2, 3, 4, 5, 6], 'nested numbers is updated');
    deepEqual(evenNestedNumbers, [2, 4, 6, 22], 'adds new number');
  });
});

QUnit.test('multiple dependent keys can be specified via brace expansion', function() {
  var obj = EmberObject.createWithMixins({
    bar: Ember.A(),
    baz: Ember.A(),
    foo: reduceComputed({
      initialValue: Ember.A(),
      addedItem(array, item) {
        array.pushObject('a:' + item);
        return array;
      },
      removedItem(array, item) {
        array.pushObject('r:' + item);
        return array;
      }
    }).property('{bar,baz}')
  });

  deepEqual(get(obj, 'foo'), [], 'initially empty');

  get(obj, 'bar').pushObject(1);

  deepEqual(get(obj, 'foo'), ['a:1'], 'added item from brace-expanded dependency');

  get(obj, 'baz').pushObject(2);

  deepEqual(get(obj, 'foo'), ['a:1', 'a:2'], 'added item from brace-expanded dependency');

  get(obj, 'bar').popObject();

  deepEqual(get(obj, 'foo'), ['a:1', 'a:2', 'r:1'], 'removed item from brace-expanded dependency');

  get(obj, 'baz').popObject();

  deepEqual(get(obj, 'foo'), ['a:1', 'a:2', 'r:1', 'r:2'], 'removed item from brace-expanded dependency');
});

QUnit.test('multiple item property keys can be specified via brace expansion', function() {
  var expected = Ember.A();
  var item = { propA: 'A', propB: 'B', propC: 'C' };
  var obj = EmberObject.createWithMixins({
    bar: Ember.A([item]),
    foo: reduceComputed({
      initialValue: Ember.A(),
      addedItem(array, item, changeMeta) {
        array.pushObject('a:' + get(item, 'propA') + ':' + get(item, 'propB') + ':' + get(item, 'propC'));
        return array;
      },
      removedItem(array, item, changeMeta) {
        array.pushObject('r:' + get(item, 'propA') + ':' + get(item, 'propB') + ':' + get(item, 'propC'));
        return array;
      }
    }).property('bar.@each.{propA,propB}')
  });

  expected.pushObjects(['a:A:B:C']);
  deepEqual(get(obj, 'foo'), expected, 'initially added dependent item');

  set(item, 'propA', 'AA');

  expected.pushObjects(['r:AA:B:C', 'a:AA:B:C']);
  deepEqual(get(obj, 'foo'), expected, 'observing item property key specified via brace expansion');

  set(item, 'propB', 'BB');

  expected.pushObjects(['r:AA:BB:C', 'a:AA:BB:C']);
  deepEqual(get(obj, 'foo'), expected, 'observing item property key specified via brace expansion');

  set(item, 'propC', 'CC');

  deepEqual(get(obj, 'foo'), expected, 'not observing unspecified item properties');
});

QUnit.test('doubly nested item property keys (@each.foo.@each) are not supported', function() {
  run(function() {
    obj = EmberObject.createWithMixins({
      peopleByOrdinalPosition: Ember.A([{ first: Ember.A([EmberObject.create({ name: 'Jaime Lannister' })]) }]),
      people: arrayComputed({
        addedItem(array, item) {
          array.pushObject(get(item, 'first.firstObject'));
          return array;
        }
      }).property('peopleByOrdinalPosition.@each.first'),
      names: arrayComputed({
        addedItem(array, item) {
          equal(get(item, 'name'), 'Jaime Lannister');
          array.pushObject(item.get('name'));
          return array;
        }
      }).property('people.@each.name')
    });
  });

  equal(obj.get('names.firstObject'), 'Jaime Lannister', 'Doubly nested item properties can be retrieved manually');

  throws(function() {
    obj = EmberObject.createWithMixins({
      people: [{ first: Ember.A([EmberObject.create({ name: 'Jaime Lannister' })]) }],
      names: arrayComputed({
        addedItem(array, item) {
          array.pushObject(item);
          return array;
        }
      }).property('people.@each.first.@each.name')
    });
  }, /Nested @each/, 'doubly nested item property keys are not supported');
});

QUnit.test('after the first retrieval, array computed properties observe dependent arrays', function() {
  get(obj, 'numbers');
  var evenNumbers = get(obj, 'evenNumbers');

  deepEqual(evenNumbers, [2, 4, 6], 'precond -- starts off with correct values');

  run(function() {
    set(obj, 'numbers', Ember.A([20, 23, 28]));
  });

  deepEqual(evenNumbers, [20, 28], 'array computed properties watch dependent arrays');
});

QUnit.test('array observers are torn down when dependent arrays change', function() {
  var numbers = get(obj, 'numbers');
  get(obj, 'evenNumbers');

  equal(addCalls, 6, 'precond - add has been called for each item in the array');
  equal(removeCalls, 0, 'precond - removed has not been called');

  run(function() {
    set(obj, 'numbers', Ember.A([20, 23, 28]));
  });

  equal(addCalls, 9, 'add is called for each item in the new array');
  equal(removeCalls, 0, 'remove is not called when the array is reset');

  numbers.replace(0, numbers.get('length'), Ember.A([7,8,9,10]));

  equal(addCalls, 9, 'add is not called');
  equal(removeCalls, 0, 'remove is not called');
});

QUnit.test('modifying properties on dependent array items triggers observers exactly once', function() {
  var numbers = get(obj, 'numbers');
  var evenNumbers = get(obj, 'evenNumbers');

  equal(addCalls, 6, 'precond - add has not been called for each item in the array');
  equal(removeCalls, 0, 'precond - removed has not been called');

  run(function() {
    numbers.replace(0, 2, [7,8,9,10]);
  });

  equal(addCalls, 10, 'add is called for each item added');
  equal(removeCalls, 2, 'removed is called for each item removed');
  deepEqual(evenNumbers, [4,6,8,10], 'sanity check - dependent arrays are updated');
});

QUnit.test('multiple array computed properties on the same object can observe dependent arrays', function() {
  var numbers = get(obj, 'numbers');
  var otherNumbers = get(obj, 'otherNumbers');

  deepEqual(get(obj, 'evenNumbers'), [2,4,6], 'precond - evenNumbers is initially correct');
  deepEqual(get(obj, 'evenNumbersMultiDep'), [2, 4, 6, 8], 'precond - evenNumbersMultiDep is initially correct');

  run(function() {
    numbers.pushObject(12);
    otherNumbers.pushObject(14);
  });

  deepEqual(get(obj, 'evenNumbers'), [2,4,6,12], 'evenNumbers is updated');
  deepEqual(get(obj, 'evenNumbersMultiDep'), [2, 4, 6, 8, 12, 14], 'evenNumbersMultiDep is updated');
});

QUnit.test('an error is thrown when a reduceComputed is defined without an initialValue property', function() {
  var defineExploder = function() {
    EmberObject.createWithMixins({
      collection: Ember.A(),
      exploder: reduceComputed('collection', {
        initialize(initialValue, changeMeta, instanceMeta) {},

        addedItem(accumulatedValue, item, changeMeta, instanceMeta) {
          return item;
        },

        removedItem(accumulatedValue, item, changeMeta, instanceMeta) {
          return item;
        }
      })
    });
  };

  throws(defineExploder, /declared\ without\ an\ initial\ value/, 'an error is thrown when the reduceComputed is defined without an initialValue');
});

QUnit.test('dependent arrays with multiple item properties are not double-counted', function() {
  var obj = EmberObject.extend({
    items: Ember.A([{ foo: true }, { bar: false }, { bar: true }]),
    countFooOrBar: reduceComputed({
      initialValue: 0,
      addedItem(acc) {
        ++addCalls;
        return acc;
      },

      removedItem(acc) {
        ++removeCalls;
        return acc;
      }
    }).property('items.@each.foo', 'items.@each.bar', 'items')
  }).create();

  equal(0, addCalls, 'precond - no adds yet');
  equal(0, removeCalls, 'precond - no removes yet');

  get(obj, 'countFooOrBar');

  equal(3, addCalls, 'all items added once');
  equal(0, removeCalls, 'no removes yet');
});

QUnit.test('dependent arrays can use `replace` with an out of bounds index to add items', function() {
  var dependentArray = Ember.A();
  var array;

  obj = EmberObject.extend({
    dependentArray: dependentArray,
    computed: arrayComputed('dependentArray', {
      addedItem(acc, item, changeMeta) {
        acc.insertAt(changeMeta.index, item);
        return acc;
      },
      removedItem(acc) { return acc; }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], 'precond - computed array is initially empty');

  dependentArray.replace(100, 0, [1, 2]);

  deepEqual(array, [1, 2], 'index >= length treated as a push');

  dependentArray.replace(-100, 0, [3, 4]);

  deepEqual(array, [3, 4, 1, 2], 'index < 0 treated as an unshift');
});

QUnit.test('dependent arrays can use `replace` with a negative index to remove items indexed from the right', function() {
  var dependentArray = Ember.A([1,2,3,4,5]);
  var array;

  obj = EmberObject.extend({
    dependentArray: dependentArray,
    computed: arrayComputed('dependentArray', {
      addedItem(acc, item) { return acc; },
      removedItem(acc, item) {
        acc.pushObject(item);
        return acc;
      }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], 'precond - no items have been removed initially');

  dependentArray.replace(-3, 2);

  deepEqual(array, [4,3], 'index < 0 used as a right index for removal');
});

QUnit.test('dependent arrays that call `replace` with an out of bounds index to remove items is a no-op', function() {
  var dependentArray = Ember.A([1, 2]);
  var array;

  obj = EmberObject.extend({
    dependentArray: dependentArray,
    computed: arrayComputed('dependentArray', {
      addedItem(acc, item, changeMeta) { return acc; },
      removedItem(acc) {
        ok(false, 'no items have been removed');
      }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], 'precond - computed array is initially empty');

  dependentArray.replace(100, 2);
});

QUnit.test('dependent arrays that call `replace` with a too-large removedCount a) works and b) still right-truncates', function() {
  var dependentArray = Ember.A([1, 2]);
  var array;

  obj = EmberObject.extend({
    dependentArray: dependentArray,
    computed: arrayComputed('dependentArray', {
      addedItem(acc, item) { return acc; },
      removedItem(acc, item) {
        acc.pushObject(item);
        return acc;
      }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], 'precond - computed array is initially empty');

  dependentArray.replace(1, 200);

  deepEqual(array, [2], 'array was correctly right-truncated');
});

QUnit.test('removedItem is not erroneously called for dependent arrays during a recomputation', function() {
  function addedItem(array, item, changeMeta) {
    array.insertAt(changeMeta.index, item);
    return array;
  }

  function removedItem(array, item, changeMeta) {
    ok(get(array, 'length') > changeMeta.index, 'removedItem not called with invalid index');
    array.removeAt(changeMeta.index, 1);
    return array;
  }

  var options = {
        addedItem: addedItem,
        removedItem: removedItem
      };

  obj = EmberObject.extend({
    dependentArray: Ember.A([1, 2]),
    identity0: arrayComputed('dependentArray', options),
    identity1: arrayComputed('identity0', options)
  }).create();

  get(obj, 'identity1');
  run(function() {
    obj.notifyPropertyChange('dependentArray');
  });

  ok(true, 'removedItem not invoked with invalid index');
});

QUnit.module('arrayComputed - recomputation DKs', {
  setup() {
    expectDeprecation(function() {

      obj = EmberObject.extend({
        people: Ember.A([{
          name: 'Jaime Lannister',
          title: 'Kingsguard'
        }, {
          name: 'Cersei Lannister',
          title: 'Queen'
        }]),

        titles: arrayComputed('people', {
          addedItem(acc, person) {
            acc.pushObject(get(person, 'title'));
            return acc;
          }
        })
      }).create();
    }, 'Ember.arrayComputed is deprecated. Replace it with plain array methods');

  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test('recomputations from `arrayComputed` observers add back dependent keys', function() {
  var meta = metaFor(obj);
  get(obj, 'people');
  var titles;

  equal(meta.deps, undefined, 'precond - nobody depends on people\'');
  equal(meta.watching.people, undefined, 'precond - nobody is watching people');

  titles = get(obj, 'titles');

  deepEqual(titles, ['Kingsguard', 'Queen'], 'precond - value is correct');

  ok(meta.deps.people !== undefined, 'people has dependencies');
  deepEqual(keys(meta.deps.people), ['titles'], 'only titles depends on people');
  equal(meta.deps.people.titles, 1, 'titles depends on people exactly once');
  equal(meta.watching.people, 2, 'people has two watchers: the array listener and titles');

  run(function() {
    set(obj, 'people', Ember.A());
  });

  // Regular CPs are invalidated when their dependent keys change, but array
  // computeds keep refs up to date
  deepEqual(titles, [], 'value is correct');
  equal(meta.cache.titles, titles, 'value remains cached');
  ok(meta.deps.people !== undefined, 'people has dependencies');
  deepEqual(keys(meta.deps.people), ['titles'], 'meta.deps.people is unchanged');
  equal(meta.deps.people.titles, 1, 'deps.people.titles is unchanged');
  equal(meta.watching.people, 2, 'watching.people is unchanged');
});

QUnit.module('Ember.arryComputed - self chains', {
  setup() {
    var a = EmberObject.create({ name: 'a' });
    var b = EmberObject.create({ name: 'b' });

    expectDeprecation(function() {

      obj = ArrayProxy.createWithMixins({
        content: Ember.A([a, b]),
        names: arrayComputed('@this.@each.name', {
          addedItem(array, item, changeMeta, instanceMeta) {
            var mapped = get(item, 'name');
            array.insertAt(changeMeta.index, mapped);
            return array;
          },
          removedItem(array, item, changeMeta, instanceMeta) {
            array.removeAt(changeMeta.index, 1);
            return array;
          }
        })
      });
    }, 'Ember.arrayComputed is deprecated. Replace it with plain array methods');
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test('@this can be used to treat the object as the array itself', function() {
  var names = get(obj, 'names');

  deepEqual(names, ['a', 'b'], 'precond - names is initially correct');

  run(function() {
    obj.objectAt(1).set('name', 'c');
  });

  deepEqual(names, ['a', 'c'], '@this can be used with item property observers');

  run(function() {
    obj.pushObject({ name: 'd' });
  });

  deepEqual(names, ['a', 'c', 'd'], '@this observes new items');
});

QUnit.module('arrayComputed - changeMeta property observers', {
  setup() {
    callbackItems = [];
    run(function() {
      expectDeprecation(function() {

        obj = EmberObject.createWithMixins({
          items: Ember.A([EmberObject.create({ n: 'zero' }), EmberObject.create({ n: 'one' })]),
          itemsN: arrayComputed('items.@each.n', {
            addedItem(array, item, changeMeta, instanceMeta) {
              callbackItems.push('add:' + changeMeta.index + ':' + get(changeMeta.item, 'n'));
            },
            removedItem(array, item, changeMeta, instanceMeta) {
              callbackItems.push('remove:' + changeMeta.index + ':' + get(changeMeta.item, 'n'));
            }
          })
        });
      }, 'Ember.arrayComputed is deprecated. Replace it with plain array methods');
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test('changeMeta includes item and index', function() {
  var expected, items, item;

  items = get(obj, 'items');

  // initial computation add0 add1
  run(function() {
    obj.get('itemsN');
  });

  // add2
  run(function() {
    items.pushObject(EmberObject.create({ n: 'two' }));
  });

  // remove2
  run(function() {
    items.popObject();
  });

  // remove0 add0
  run(function() {
    set(get(items, 'firstObject'), 'n', 'zero\'');
  });

  expected = ['add:0:zero', 'add:1:one', 'add:2:two', 'remove:2:two', 'remove:0:zero\'', 'add:0:zero\''];
  deepEqual(callbackItems, expected, 'changeMeta includes items');

  // [zero', one] -> [zero', one, five, six]
  // add2 add3
  run(function() {
    items.pushObject(EmberObject.create({ n: 'five' }));
    items.pushObject(EmberObject.create({ n: 'six' }));
  });

  // remove0 add0
  run(function() {
    items.objectAt(0).set('n', 'zero\'\'');
  });

  expected = expected.concat(['add:2:five', 'add:3:six', 'remove:0:zero\'\'', 'add:0:zero\'\'']);
  deepEqual(callbackItems, expected, 'changeMeta includes items');

  // [zero'', one, five, six] -> [zero'', five, six]
  // remove1
  run(function() {
    item = items.objectAt(1);
    items.removeAt(1, 1);
  });

  run(function() {
    // observer should have been removed from the deleted item
    item.set('n', 'ten thousand');
  });

  // [zero'', five, six] -> [zero'', five, seven]
  // remove2 add2
  run(function() {
    items.objectAt(2).set('n', 'seven');
  });

  // observer should have been added to the new item
  expected = expected.concat(['remove:1:one', 'remove:2:seven', 'add:2:seven']);
  deepEqual(callbackItems, expected, 'changeMeta includes items');

  // reset (does not call remove)
  run(function() {
    item = items.objectAt(1);
    set(obj, 'items', Ember.A([]));
  });

  run(function() {
    // observers should have been removed from the items in the old array
    set(item, 'n', 'eleven thousand');
  });

  deepEqual(callbackItems, expected, 'items removed from the array had observers removed');
});

QUnit.test('changeMeta includes changedCount and arrayChanged', function() {
  var obj = EmberObject.createWithMixins({
    letters: Ember.A(['a', 'b']),
    lettersArrayComputed: arrayComputed('letters', {
      addedItem(array, item, changeMeta, instanceMeta) {
        callbackItems.push('add:' + changeMeta.changedCount + ':' + changeMeta.arrayChanged.join(''));
      },
      removedItem(array, item, changeMeta, instanceMeta) {
        callbackItems.push('remove:' + changeMeta.changedCount + ':' + changeMeta.arrayChanged.join(''));
      }
    })
  });

  var letters = get(obj, 'letters');

  obj.get('lettersArrayComputed');
  letters.pushObject('c');
  letters.popObject();
  letters.replace(0, 1, ['d']);
  letters.removeAt(0, letters.length);

  var expected = ['add:2:ab', 'add:2:ab', 'add:1:abc', 'remove:1:abc', 'remove:1:ab', 'add:1:db', 'remove:2:db', 'remove:2:db'];
  deepEqual(callbackItems, expected, 'changeMeta has count and changed');
});

QUnit.test('`updateIndexes` is not over-eager about skipping retain:n (#4620)', function() {
  var tracked = Ember.A();
  obj = EmberObject.extend({
    content: Ember.A([{ n: 'one' }, { n: 'two' }]),
    items: arrayComputed('content.@each.n', {
      addedItem(array, item, changeMeta) {
        tracked.push('+' + get(item, 'n') + '@' + changeMeta.index);
        array.insertAt(changeMeta.index, item);
        return array;
      },
      removedItem(array, item, changeMeta) {
        tracked.push('-' + (changeMeta.previousValues ? changeMeta.previousValues.n : get(item, 'n')) + '@' + changeMeta.index);
        array.removeAt(changeMeta.index);
        return array;
      }
    })
  }).create();

  run(function () {
    obj.get('items');
  });

  deepEqual(tracked, ['+one@0', '+two@1'], 'precond - array is set up correctly');

  run(function () {
    obj.get('content').shiftObject();
  });

  deepEqual(tracked, ['+one@0', '+two@1', '-one@0'], 'array handles unshift correctly');

  run(function () {
    set(obj, 'content.lastObject.n', 'three');
  });

  deepEqual(tracked, ['+one@0', '+two@1', '-one@0', '-two@0', '+three@0'], 'array handles a change when operations are delete:m retain:n-m');
});

QUnit.test('when initialValue is undefined, everything works as advertised', function() {
  var chars = EmberObject.createWithMixins({
    letters: Ember.A(),
    firstUpper: reduceComputed('letters', {
      initialValue: undefined,

      initialize(initialValue, changeMeta, instanceMeta) {
        instanceMeta.matchingItems = Ember.A();
        instanceMeta.subArray = new SubArray();
        instanceMeta.firstMatch = function() {
          return getWithDefault(instanceMeta.matchingItems, 'firstObject', initialValue);
        };
      },

      addedItem(accumulatedValue, item, changeMeta, instanceMeta) {
        var filterIndex;
        filterIndex = instanceMeta.subArray.addItem(changeMeta.index, item.toUpperCase() === item);
        if (filterIndex > -1) {
          instanceMeta.matchingItems.insertAt(filterIndex, item);
        }
        return instanceMeta.firstMatch();
      },

      removedItem(accumulatedValue, item, changeMeta, instanceMeta) {
        var filterIndex = instanceMeta.subArray.removeItem(changeMeta.index);
        if (filterIndex > -1) {
          instanceMeta.matchingItems.removeAt(filterIndex);
        }
        return instanceMeta.firstMatch();
      }
    })
  });
  equal(get(chars, 'firstUpper'), undefined, 'initialValue is undefined');

  get(chars, 'letters').pushObjects(['a', 'b', 'c']);

  equal(get(chars, 'firstUpper'), undefined, 'result is undefined when no matches are present');

  get(chars, 'letters').pushObjects(['A', 'B', 'C']);

  equal(get(chars, 'firstUpper'), 'A', 'result is the first match when matching objects are present');

  get(chars, 'letters').removeAt(3);

  equal(get(chars, 'firstUpper'), 'B', 'result is the next match when the first matching object is removed');
});

QUnit.module('arrayComputed - completely invalidating dependencies', {
  setup() {
    addCalls = removeCalls = 0;
  }
});

QUnit.test('non-array dependencies completely invalidate a reduceComputed CP', function() {
  var dependentArray = Ember.A();

  expectDeprecation(/Ember.arrayComputed is deprecated/);

  obj = EmberObject.extend({
    nonArray: 'v0',
    dependentArray: dependentArray,

    computed: arrayComputed('dependentArray', 'nonArray', {
      addedItem(array) {
        ++addCalls;
        return array;
      },

      removedItem(array) {
        --removeCalls;
        return array;
      }
    })
  }).create();

  get(obj, 'computed');

  equal(addCalls, 0, 'precond - add has not initially been called');
  equal(removeCalls, 0, 'precond - remove has not initially been called');

  dependentArray.pushObjects([1, 2]);

  equal(addCalls, 2, 'add called one-at-a-time for dependent array changes');
  equal(removeCalls, 0, 'remove not called');

  run(function() {
    set(obj, 'nonArray', 'v1');
  });

  equal(addCalls, 4, 'array completely recomputed when non-array dependency changed');
  equal(removeCalls, 0, 'remove not called');
});

QUnit.test('array dependencies specified with `.[]` completely invalidate a reduceComputed CP', function() {
  expectDeprecation(/Ember.arrayComputed is deprecated/);

  var dependentArray = Ember.A();
  var totallyInvalidatingDependentArray = Ember.A();

  obj = EmberObject.extend({
    totallyInvalidatingDependentArray: totallyInvalidatingDependentArray,
    dependentArray: dependentArray,

    computed: arrayComputed('dependentArray', 'totallyInvalidatingDependentArray.[]', {
      addedItem(array, item) {
        ok(item !== 3, 'totally invalidating items are never passed to the one-at-a-time callbacks');
        ++addCalls;
        return array;
      },

      removedItem(array, item) {
        ok(item !== 3, 'totally invalidating items are never passed to the one-at-a-time callbacks');
        --removeCalls;
        return array;
      }
    })
  }).create();

  get(obj, 'computed');

  equal(addCalls, 0, 'precond - add has not initially been called');
  equal(removeCalls, 0, 'precond - remove has not initially been called');

  dependentArray.pushObjects([1, 2]);

  equal(addCalls, 2, 'add called one-at-a-time for dependent array changes');
  equal(removeCalls, 0, 'remove not called');

  run(function() {
    totallyInvalidatingDependentArray.pushObject(3);
  });

  equal(addCalls, 4, 'array completely recomputed when totally invalidating dependent array modified');
  equal(removeCalls, 0, 'remove not called');
});

QUnit.test('returning undefined in addedItem/removedItem completely invalidates a reduceComputed CP', function() {
  expectDeprecation(/Ember.reduceComputed is deprecated/);

  var dependentArray = Ember.A([3,2,1]);
  var counter = 0;

  obj = EmberObject.extend({
    dependentArray: dependentArray,

    computed: reduceComputed('dependentArray', {
      initialValue: Infinity,

      addedItem(accumulatedValue, item, changeMeta, instanceMeta) {
        return Math.min(accumulatedValue, item);
      },

      removedItem(accumulatedValue, item, changeMeta, instanceMeta) {
        if (item > accumulatedValue) {
          return accumulatedValue;
        }
      }
    }),

    computedDidChange: observer('computed', function() {
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
  QUnit.test('reduceComputed complains about array dependencies that are not `Ember.Array`s', function() {
    expectDeprecation(/Ember.reduceComputed is deprecated/);

    var Type = EmberObject.extend({
      rc: reduceComputed('array', {
        initialValue: 0,
        addedItem(v) {
          return v;
        },
        removedItem(v) {
          return v;
        }
      })
    });

    expectAssertion(function() {
      obj = Type.create({ array: [] });
      get(obj, 'rc');
    }, /must be an `Ember.Array`/, 'Ember.reduceComputed complains about dependent non-extended native arrays');
  });
}

QUnit.module('arrayComputed - misc', {
  setup() {
    callbackItems = [];

    shared = Ember.Object.create({
      flag: false
    });

    var Item = Ember.Object.extend({
      shared: shared,
      flag: computed('shared.flag', function () {
        return this.get('shared.flag');
      })
    });

    expectDeprecation(function() {
      obj = Ember.Object.extend({
        upstream: Ember.A([
          Item.create(),
          Item.create()
        ]),
        arrayCP: arrayComputed('upstream.@each.flag', {
          addedItem(array, item) {
            callbackItems.push('add:' + item.get('flag'));
            return array;
          },

          removedItem(array, item) {
            callbackItems.push('remove:' + item.get('flag'));
            return array;
          }
        })
      }).create();
    }, 'Ember.arrayComputed is deprecated. Replace it with plain array methods');
  },

  teardown() {
    run(function () {
      obj.destroy();
    });
  }
});

QUnit.test('item property change flushes are gated by a semaphore', function() {
  obj.get('arrayCP');
  deepEqual(callbackItems, ['add:false', 'add:false'], 'precond - calls are initially correct');

  callbackItems.splice(0, 2);

  shared.set('flag', true);
  deepEqual(callbackItems, ['remove:true', 'add:true', 'remove:true', 'add:true'], 'item property flushes that depend on a shared prop are gated by a semaphore');
});
