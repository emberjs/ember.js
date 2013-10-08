var forEach = Ember.EnumerableUtils.forEach, subarray;

module('Ember.SubArray', {
  setup: function () {
    subarray = new Ember.SubArray();
  }
});

function operationsString() {
  var str = "";
  forEach(subarray._operations, function (operation) {
    str += " " + operation.type + ":" + operation.count;
  });
  return str.substring(1);
}

test("Subarray operations are initially retain:n", function() {
  subarray = new Ember.SubArray(10);

  equal(operationsString(), "r:10", "subarray operations are initially retain n");
});

test("Retains compose with retains on insert", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, true);
  subarray.addItem(2, true);

  equal(operationsString(), "r:3", "Retains compose with retains on insert.");
});

test("Retains compose with retains on removal", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, false);
  subarray.addItem(2, true);

  equal(operationsString(), "r:1 f:1 r:1", "precond - operations are initially correct.");

  subarray.removeItem(1);

  equal(operationsString(), "r:2", "Retains compose with retains on removal.");
});

test("Filters compose with filters on insert", function() {
  subarray.addItem(0, false);
  subarray.addItem(1, false);
  subarray.addItem(2, false);

  equal(operationsString(), "f:3", "Retains compose with retains on insert.");
});

test("Filters compose with filters on removal", function() {
  subarray.addItem(0, false);
  subarray.addItem(1, true);
  subarray.addItem(2, false);

  equal(operationsString(), "f:1 r:1 f:1", "precond - operations are initially correct.");

  subarray.removeItem(1);

  equal(operationsString(), "f:2", "Filters compose with filters on removal.");
});

test("Filters split retains", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, true);
  subarray.addItem(1, false);

  equal(operationsString(), "r:1 f:1 r:1", "Filters split retains.");
});

test("Retains split filters", function() {
  subarray.addItem(0, false);
  subarray.addItem(1, false);
  subarray.addItem(1, true);

  equal(operationsString(), "f:1 r:1 f:1", "Retains split filters.");
});

test("`addItem` returns the index of the item in the subarray", function() {
  var indexes = [];

  equal(subarray.addItem(0, true), 0, "`addItem` returns the index of the item in the subarray");
  subarray.addItem(1, false);
  equal(subarray.addItem(2, true), 1, "`addItem` returns the index of the item in the subarray");

  equal(operationsString(), "r:1 f:1 r:1", "Operations are correct.");
});

test("`addItem` returns -1 if the new item is not in the subarray", function() {
  equal(subarray.addItem(0, false), -1, "`addItem` returns -1 if the item is not in the subarray");
});

test("`removeItem` returns the index of the item in the subarray", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, false);
  subarray.addItem(2, true);

  equal(subarray.removeItem(2), 1, "`removeItem` returns the index of the item in the subarray");
  equal(subarray.removeItem(0), 0, "`removeItem` returns the index of the item in the subarray");
});

test("`removeItem` returns -1 if the item was not in the subarray", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, false);

  equal(subarray.removeItem(1), -1, "`removeItem` returns -1 if the item is not in the subarray");
});

test("`removeItem` raises a sensible exception when there are no operations in the subarray", function() {
  var subarrayExploder = function() {
    subarray.removeItem(9);
  };
  throws(subarrayExploder, /never\ been\ added/, "`removeItem` raises a sensible exception when there are no operations in the subarray");
});

test("left composition does not confuse a subsequent right non-composition", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, false);
  subarray.addItem(2, true);
  equal(operationsString(), "r:1 f:1 r:1", "precond - initial state of subarray is as expected");

  subarray.addItem(1, true);
  equal(operationsString(), "r:2 f:1 r:1", "left-composition does not confuse right non-composition");
});
