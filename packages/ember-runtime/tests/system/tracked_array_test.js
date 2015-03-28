import TrackedArray from "ember-runtime/system/tracked_array";

var trackedArray;
var RETAIN = TrackedArray.RETAIN;
var INSERT = TrackedArray.INSERT;
var DELETE = TrackedArray.DELETE;

QUnit.module('Ember.TrackedArray');

QUnit.test("operations for a tracked array of length n are initially retain:n", function() {
  trackedArray = new TrackedArray([1,2,3,4]);

  equal("r:4", trackedArray.toString(), "initial mutation is retain n");
});

QUnit.test("insert zero items is a no-op", function() {
  trackedArray = new TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, []);

  equal(trackedArray.toString(), "r:4", "insert:0 is a no-op");

  deepEqual(trackedArray._operations[0].items, [1,2,3,4], "after a no-op, existing operation has right items");
});

QUnit.test("inserts can split retains", function() {
  trackedArray = new TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, ['a']);

  equal(trackedArray.toString(), "r:2 i:1 r:2", "inserts can split retains");

  deepEqual(trackedArray._operations[0].items, [1,2], "split retains have the right items");
  deepEqual(trackedArray._operations[1].items, ['a'], "inserts have the right items");
  deepEqual(trackedArray._operations[2].items, [3,4], "split retains have the right items");
});

QUnit.test("inserts can expand (split/compose) inserts", function() {
  trackedArray = new TrackedArray([]);

  trackedArray.addItems(0, [1,2,3,4]);
  trackedArray.addItems(2, ['a']);

  equal(trackedArray.toString(), "i:5", "inserts can expand inserts");

  deepEqual(trackedArray._operations[0].items, [1,2,'a',3,4], "expanded inserts have the right items");
});

QUnit.test("inserts left of inserts compose", function() {
  trackedArray = new TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, ['b']);
  trackedArray.addItems(2, ['a']);

  equal(trackedArray.toString(), "r:2 i:2 r:2", "inserts left of inserts compose");

  deepEqual(trackedArray._operations[0].items, [1,2], "split retains have the right items");
  deepEqual(trackedArray._operations[1].items, ['a', 'b'], "composed inserts have the right items");
  deepEqual(trackedArray._operations[2].items, [3,4], "split retains have the right items");
});

QUnit.test("inserts right of inserts compose", function() {
  trackedArray = new TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, ['a']);
  trackedArray.addItems(3, ['b']);

  equal(trackedArray.toString(), "r:2 i:2 r:2", "inserts right of inserts compose");

  deepEqual(trackedArray._operations[0].items, [1,2], "split retains have the right items");
  deepEqual(trackedArray._operations[1].items, ['a', 'b'], "composed inserts have the right items");
  deepEqual(trackedArray._operations[2].items, [3,4], "split retains have the right items");
});

QUnit.test("delete zero items is a no-op", function() {
  trackedArray = new TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, []);

  equal(trackedArray.toString(), "r:4", "insert:0 is a no-op");

  deepEqual(trackedArray._operations[0].items, [1,2,3,4], "after a no-op, existing operation has right items");
});

QUnit.test("deletes compose with several inserts and retains", function() {
  trackedArray = new TrackedArray([1,2,3,4]);

  trackedArray.addItems(4, ['e']);
  trackedArray.addItems(3, ['d']);
  trackedArray.addItems(2, ['c']);
  trackedArray.addItems(1, ['b']);
  trackedArray.addItems(0, ['a']); // a1b2c3d4e i1r1i1r1i1r1i1r1i1

  trackedArray.removeItems(0, 9);
  equal(trackedArray.toString(), "d:4", "deletes compose with several inserts and retains");
});

QUnit.test("deletes compose with several inserts and retains and an adjacent delete", function() {
  trackedArray = new TrackedArray([1,2,3,4,5]);

  trackedArray.removeItems(0, 1);
  trackedArray.addItems(4, ['e']);
  trackedArray.addItems(3, ['d']);
  trackedArray.addItems(2, ['c']);
  trackedArray.addItems(1, ['b']);
  trackedArray.addItems(0, ['a']); // a2b3c4d5e d1i1r1i1r1i1r1i1r1i1

  trackedArray.removeItems(0, 9);
  equal(trackedArray.toString(), "d:5", "deletes compose with several inserts, retains, and a single prior delete");
});

QUnit.test("deletes compose with several inserts and retains and can reduce the last one", function() {
  trackedArray = new TrackedArray([1,2,3,4]);

  trackedArray.addItems(4, ['e', 'f']);
  trackedArray.addItems(3, ['d']);
  trackedArray.addItems(2, ['c']);
  trackedArray.addItems(1, ['b']);
  trackedArray.addItems(0, ['a']); // a1b2c3d4e i1r1i1r1i1r1i1r1i2

  trackedArray.removeItems(0, 9);
  equal(trackedArray.toString(), "d:4 i:1", "deletes compose with several inserts and retains, reducing the last one");
  deepEqual(trackedArray._operations[1].items, ['f'], "last mutation's items is correct");
});

QUnit.test("deletes can split retains", function() {
  trackedArray = new TrackedArray([1,2,3,4]);
  trackedArray.removeItems(0, 2);

  equal(trackedArray.toString(), "d:2 r:2", "deletes can split retains");
  deepEqual(trackedArray._operations[1].items, [3,4], "retains reduced by delete have the right items");
});

QUnit.test("deletes can trim retains on the right", function() {
  trackedArray = new TrackedArray([1,2,3]);
  trackedArray.removeItems(2, 1);

  equal(trackedArray.toString(), "r:2 d:1", "deletes can trim retains on the right");
  deepEqual(trackedArray._operations[0].items, [1,2], "retains reduced by delete have the right items");
});

QUnit.test("deletes can trim retains on the left", function() {
  trackedArray = new TrackedArray([1,2,3]);
  trackedArray.removeItems(0, 1);

  equal(trackedArray.toString(), "d:1 r:2", "deletes can trim retains on the left");
  deepEqual(trackedArray._operations[1].items, [2,3], "retains reduced by delete have the right items");
});

QUnit.test("deletes can split inserts", function() {
  trackedArray = new TrackedArray([]);
  trackedArray.addItems(0, ['a','b','c']);
  trackedArray.removeItems(0, 1);

  equal(trackedArray.toString(), "i:2", "deletes can split inserts");
  deepEqual(trackedArray._operations[0].items, ['b', 'c'], "inserts reduced by delete have the right items");
});

QUnit.test("deletes can trim inserts on the right", function() {
  trackedArray = new TrackedArray([]);
  trackedArray.addItems(0, ['a','b','c']);
  trackedArray.removeItems(2, 1);

  equal(trackedArray.toString(), "i:2", "deletes can trim inserts on the right");
  deepEqual(trackedArray._operations[0].items, ['a', 'b'], "inserts reduced by delete have the right items");
});

QUnit.test("deletes can trim inserts on the left", function() {
  trackedArray = new TrackedArray([]);
  trackedArray.addItems(0, ['a','b','c']);
  trackedArray.removeItems(0, 1);

  equal(trackedArray.toString(), "i:2", "deletes can trim inserts on the right");
  deepEqual(trackedArray._operations[0].items, ['b', 'c'], "inserts reduced by delete have the right items");
});

QUnit.test("deletes can trim inserts on the left while composing with a delete on the left", function() {
  trackedArray = new TrackedArray(['a']);
  trackedArray.removeItems(0, 1);
  trackedArray.addItems(0, ['b', 'c']);
  trackedArray.removeItems(0, 1);

  equal(trackedArray.toString(), "d:1 i:1", "deletes can trim inserts and compose with a delete on the left");
  deepEqual(trackedArray._operations[1].items, ['c'], "inserts reduced by delete have the right items");
});

QUnit.test("deletes can reduce an insert or retain, compose with several mutations of different types and reduce the last mutation if it is non-delete", function() {
  trackedArray = new TrackedArray([1,2,3,4]);

  trackedArray.addItems(4, ['e', 'f']);    // 1234ef
  trackedArray.addItems(3, ['d']);         // 123d4ef
  trackedArray.addItems(2, ['c']);         // 12c3d4ef
  trackedArray.addItems(1, ['b']);         // 1b2c3d4ef
  trackedArray.addItems(0, ['a','a','a']); // aaa1b2c3d4ef i3r1i1r1i1r1i1r1i2

  trackedArray.removeItems(1, 10);
  equal(trackedArray.toString(), "i:1 d:4 i:1", "deletes reduce an insert, compose with several inserts and retains, reducing the last one");
  deepEqual(trackedArray._operations[0].items, ['a'], "first reduced mutation's items is correct");
  deepEqual(trackedArray._operations[2].items, ['f'], "last reduced mutation's items is correct");
});

QUnit.test("removeItems returns the removed items", function() {
  trackedArray = new TrackedArray([1,2,3,4]);
  deepEqual(trackedArray.removeItems(1, 2), [2,3], "`removeItems` returns the removed items");
});

QUnit.test("apply invokes the callback with each group of items and the mutation's calculated offset", function() {
  var i = 0;
  trackedArray = new TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, ['a','b','c']); // 12abc34
  trackedArray.removeItems(4, 2);          // 12ab4
  trackedArray.addItems(1, ['d']);         // 1d2ab4 r1 i1 r1 i2 d1 r1

  equal(trackedArray.toString(), "r:1 i:1 r:1 i:2 d:1 r:1", "precond - trackedArray is in expected state");

  trackedArray.apply(function (items, offset, operation) {
    switch (i++) {
      case 0:
        deepEqual(items, [1], "callback passed right items");
        equal(offset, 0, "callback passed right offset");
        equal(operation, RETAIN, "callback passed right operation");
        break;
      case 1:
        deepEqual(items, ['d'], "callback passed right items");
        equal(offset, 1, "callback passed right offset");
        equal(operation, INSERT, "callback passed right operation");
        break;
      case 2:
        deepEqual(items, [2], "callback passed right items");
        equal(offset, 2, "callback passed right offset");
        equal(operation, RETAIN, "callback passed right operation");
        break;
      case 3:
        deepEqual(items, ['a','b'], "callback passed right items");
        equal(offset, 3, "callback passed right offset");
        equal(operation, INSERT, "callback passed right operation");
        break;
      case 4:
        // deletes not passed items at the moment; that might need to be added
        // if TrackedArray is used more widely
        equal(offset, 5, "callback passed right offset");
        equal(operation, DELETE, "callback passed right operation");
        break;
      case 5:
        deepEqual(items, [4], "callback passed right items");
        equal(offset, 5, "callback passed right offset");
        equal(operation, RETAIN, "callback passed right operation");
        break;
    }
  });
  equal(i, 6, "`apply` invoked callback right number of times");

  equal(trackedArray.toString(), "r:6", "after `apply` operations become retain:n");
});
