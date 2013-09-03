var get = Ember.get,
    forEach = Ember.EnumerableUtils.forEach,
    RETAIN = 'r',
    INSERT = 'i',
    DELETE = 'd';

/**
  An `Ember.TrackedArray` tracks array operations.  It's useful when you want to
  lazily compute the indexes of items in an array after they've been shifted by
  subsequent operations.

  @class TrackedArray
  @namespace Ember
  @param {array} [items=[]] The array to be tracked.  This is used just to get
  the initial items for the starting state of retain:n.
*/
Ember.TrackedArray = function (items) {
  if (arguments.length < 1) { items = []; }

  var length = get(items, 'length');

  if (length) {
    this._content = [new ArrayOperation(RETAIN, length, items)];
  } else {
    this._content = [];
  }
};

Ember.TrackedArray.RETAIN = RETAIN;
Ember.TrackedArray.INSERT = INSERT;
Ember.TrackedArray.DELETE = DELETE;

Ember.TrackedArray.prototype = {

  /**
    Track that `newItems` were added to the tracked array at `index`.

    @method addItems
    @param index
    @param newItems
  */
  addItems: function (index, newItems) {
    var count = get(newItems, 'length'),
        match = this._findArrayOperation(index),
        arrayOperation = match.operation,
        arrayOperationIndex = match.index,
        arrayOperationRangeStart = match.rangeStart,
        composeIndex,
        splitIndex,
        splitItems,
        splitArrayOperation,
        newArrayOperation;

    newArrayOperation = new ArrayOperation(INSERT, count, newItems);

    if (arrayOperation) {
      if (!match.split) {
        // insert left of arrayOperation
        this._content.splice(arrayOperationIndex, 0, newArrayOperation);
        composeIndex = arrayOperationIndex;
      } else {
        this._split(arrayOperationIndex, index - arrayOperationRangeStart, newArrayOperation);
        composeIndex = arrayOperationIndex + 1;
      }
    } else {
      // insert at end
      this._content.push(newArrayOperation);
      composeIndex = arrayOperationIndex;
    }

    this._composeInsert(composeIndex);
  },

  /**
    Track that `count` items were removed at `index`.

    @method removeItems
    @param index
    @param count
  */
  removeItems: function (index, count) {
    var match = this._findArrayOperation(index),
        arrayOperation = match.operation,
        arrayOperationIndex = match.index,
        arrayOperationRangeStart = match.rangeStart,
        newArrayOperation,
        composeIndex;

    newArrayOperation = new ArrayOperation(DELETE, count);
    if (!match.split) {
      // insert left of arrayOperation
      this._content.splice(arrayOperationIndex, 0, newArrayOperation);
      composeIndex = arrayOperationIndex;
    } else {
      this._split(arrayOperationIndex, index - arrayOperationRangeStart, newArrayOperation);
      composeIndex = arrayOperationIndex + 1;
    }

    return this._composeDelete(composeIndex);
  },

  /**
    Apply all operations, reducing them to retain:n, for `n`, the number of
    items in the array.

    `callback` will be called for each operation and will be passed the following arguments:

* {array} items The items for the given operation
* {number} offset The computed offset of the items, ie the index in the
array of the first item for this operation.
* {string} operation The type of the operation.  One of `Ember.TrackedArray.{RETAIN, DELETE, INSERT}`
*

    @method apply
    @param {function} callback
  */
  apply: function (callback) {
    var items = [],
        offset = 0;

    forEach(this._content, function (arrayOperation) {
      callback(arrayOperation.items, offset, arrayOperation.operation);

      if (arrayOperation.operation !== DELETE) {
        offset += arrayOperation.count;
        items = items.concat(arrayOperation.items);
      }
    });

    this._content = [new ArrayOperation(RETAIN, items.length, items)];
  },

  /**
    Return an ArrayOperationMatch for the operation that contains the item at `index`.

    @method _findArrayOperation

    @param {number} index the index of the item whose operation information
    should be returned.
    @private
  */
  _findArrayOperation: function (index) {
    var arrayOperationIndex,
        len,
        split = false,
        arrayOperation,
        arrayOperationRangeStart,
        arrayOperationRangeEnd;

    // OPTIMIZE: we could search these faster if we kept a balanced tree.
    // find leftmost arrayOperation to the right of `index`
    for (arrayOperationIndex = arrayOperationRangeStart = 0, len = this._content.length; arrayOperationIndex < len; ++arrayOperationIndex) {
      arrayOperation = this._content[arrayOperationIndex];

      if (arrayOperation.operation === DELETE) { continue; }

      arrayOperationRangeEnd = arrayOperationRangeStart + arrayOperation.count - 1;

      if (index === arrayOperationRangeStart) {
        break;
      } else if (index > arrayOperationRangeStart && index <= arrayOperationRangeEnd) {
        split = true;
        break;
      } else {
        arrayOperationRangeStart = arrayOperationRangeEnd + 1;
      }
    }

    return new ArrayOperationMatch(arrayOperation, arrayOperationIndex, split, arrayOperationRangeStart);
  },

  _split: function (arrayOperationIndex, splitIndex, newArrayOperation) {
    var arrayOperation = this._content[arrayOperationIndex],
        splitItems = arrayOperation.items.slice(splitIndex),
        splitArrayOperation = new ArrayOperation(arrayOperation.operation, splitItems.length, splitItems);

    // truncate LHS
    arrayOperation.count = splitIndex;
    arrayOperation.items = arrayOperation.items.slice(0, splitIndex);

    this._content.splice(arrayOperationIndex + 1, 0, newArrayOperation, splitArrayOperation);
  },

  // TODO: unify _composeInsert, _composeDelete
  // see SubArray for a better implementation.
  _composeInsert: function (index) {
    var newArrayOperation = this._content[index],
        leftArrayOperation = this._content[index-1], // may be undefined
        rightArrayOperation = this._content[index+1], // may be undefined
        leftOp = leftArrayOperation && leftArrayOperation.operation,
        rightOp = rightArrayOperation && rightArrayOperation.operation;

    if (leftOp === INSERT) {
        // merge left
        leftArrayOperation.count += newArrayOperation.count;
        leftArrayOperation.items = leftArrayOperation.items.concat(newArrayOperation.items);

      if (rightOp === INSERT) {
        // also merge right
        leftArrayOperation.count += rightArrayOperation.count;
        leftArrayOperation.items = leftArrayOperation.items.concat(rightArrayOperation.items);
        this._content.splice(index, 2);
      } else {
        // only merge left
        this._content.splice(index, 1);
      }
    } else if (rightOp === INSERT) {
      // merge right
      newArrayOperation.count += rightArrayOperation.count;
      newArrayOperation.items = newArrayOperation.items.concat(rightArrayOperation.items);
      this._content.splice(index + 1, 1);
    }
  },

  _composeDelete: function (index) {
    var arrayOperation = this._content[index],
        deletesToGo = arrayOperation.count,
        leftArrayOperation = this._content[index-1], // may be undefined
        leftOp = leftArrayOperation && leftArrayOperation.operation,
        nextArrayOperation,
        nextOp,
        nextCount,
        removedItems = [];

    if (leftOp === DELETE) {
      arrayOperation = leftArrayOperation;
      index -= 1;
    }

    for (var i = index + 1; deletesToGo > 0; ++i) {
      nextArrayOperation = this._content[i];
      nextOp = nextArrayOperation.operation;
      nextCount = nextArrayOperation.count;

      if (nextOp === DELETE) {
        arrayOperation.count += nextCount;
        continue;
      }

      if (nextCount > deletesToGo) {
        removedItems = removedItems.concat(nextArrayOperation.items.splice(0, deletesToGo));
        nextArrayOperation.count -= deletesToGo;

        // In the case where we truncate the last arrayOperation, we don't need to
        // remove it; also the deletesToGo reduction is not the entirety of
        // nextCount
        i -= 1;
        nextCount = deletesToGo;

        deletesToGo = 0;
      } else {
        removedItems = removedItems.concat(nextArrayOperation.items);
        deletesToGo -= nextCount;
      }

      if (nextOp === INSERT) {
        arrayOperation.count -= nextCount;
      }
    }

    if (arrayOperation.count > 0) {
      this._content.splice(index+1, i-1-index);
    } else {
      // The delete operation can go away; it has merely reduced some other
      // operation, as in D:3 I:4
      this._content.splice(index, 1);
    }

    return removedItems;
  }
};

function ArrayOperation (operation, count, items) {
  this.operation = operation; // RETAIN | INSERT | DELETE
  this.count = count;
  this.items = items;
}

/**
  Internal data structure used to include information when looking up operations
  by item index.

  @method ArrayOperationMatch
  @private
  @property {ArrayOperation} operation
  @property {number} index The index of `operation` in the array of operations.
  @property {boolean} split Whether or not the item index searched for would
  require a split for a new operation type.
  @property {number} rangeStart The index of the first item in the operation,
  with respect to the tracked array.  The index of the last item can be computed
  from `rangeStart` and `operation.count`.
*/
function ArrayOperationMatch(operation, index, split, rangeStart) {
  this.operation = operation;
  this.index = index;
  this.split = split;
  this.rangeStart = rangeStart;
}
