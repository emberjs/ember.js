var get = Ember.get,
    forEach = Ember.EnumerableUtils.forEach,
    RETAIN = 'r',
    FILTER = 'f';

function Operation (type, count) {
  this.type = type;
  this.count = count;
}

/**
  An `Ember.SubArray` tracks an array in a way similar to, but more specialized
  than, `Ember.TrackedArray`.  It is useful for keeping track of the indexes of
  items within a filtered array.

  @class SubArray
  @namespace Ember
*/
Ember.SubArray = function (length) {
  if (arguments.length < 1) { length = 0; }

  if (length > 0) {
    this._operations = [new Operation(RETAIN, length)];
  } else {
    this._operations = [];
  }
};

Ember.SubArray.prototype = {
  /**
    Track that an item was added to the tracked array.

    @method addItem

    @param {number} index The index of the item in the tracked array.
    @param {boolean} match `true` iff the item is included in the subarray.

    @return {number} The index of the item in the subarray.
  */
  addItem: function(index, match) {
    var returnValue = -1,
        itemType = match ? RETAIN : FILTER,
        self = this;

    this._findOperation(index, function(operation, operationIndex, rangeStart, rangeEnd, seenInSubArray) {
      var newOperation, splitOperation;

      if (itemType === operation.type) {
        ++operation.count;
      } else if (index === rangeStart) {
        // insert to the left of `operation`
        self._operations.splice(operationIndex, 0, new Operation(itemType, 1));
      } else {
        newOperation = new Operation(itemType, 1);
        splitOperation = new Operation(operation.type, rangeEnd - index + 1);
        operation.count = index - rangeStart;

        self._operations.splice(operationIndex + 1, 0, newOperation, splitOperation);
      }

      if (match) {
        if (operation.type === RETAIN) {
          returnValue = seenInSubArray + (index - rangeStart);
        } else {
          returnValue = seenInSubArray;
        }
      }

      self._composeAt(operationIndex);
    }, function(seenInSubArray) {
      self._operations.push(new Operation(itemType, 1));

      if (match) {
        returnValue = seenInSubArray;
      }

      self._composeAt(self._operations.length-1);
    });

    return returnValue;
  },

  /**
    Track that an item was removed from the tracked array.

    @method removeItem

    @param {number} index The index of the item in the tracked array.

    @return {number} The index of the item in the subarray, or `-1` if the item
    was not in the subarray.
  */
  removeItem: function(index) {
    var returnValue = -1,
        self = this;

    this._findOperation(index, function (operation, operationIndex, rangeStart, rangeEnd, seenInSubArray) {
      if (operation.type === RETAIN) {
        returnValue = seenInSubArray + (index - rangeStart);
      }

      if (operation.count > 1) {
        --operation.count;
      } else {
        self._operations.splice(operationIndex, 1);
        self._composeAt(operationIndex);
      }
    });

    return returnValue;
  },


  _findOperation: function (index, foundCallback, notFoundCallback) {
    var operationIndex,
        len,
        operation,
        rangeStart,
        rangeEnd,
        seenInSubArray = 0;

    // OPTIMIZE: change to balanced tree
    // find leftmost operation to the right of `index`
    for (operationIndex = rangeStart = 0, len = this._operations.length; operationIndex < len; rangeStart = rangeEnd + 1, ++operationIndex) {
      operation = this._operations[operationIndex];
      rangeEnd = rangeStart + operation.count - 1;

      if (index >= rangeStart && index <= rangeEnd) {
        foundCallback(operation, operationIndex, rangeStart, rangeEnd, seenInSubArray);
        return;
      } else if (operation.type === RETAIN) {
        seenInSubArray += operation.count;
      }
    }

    notFoundCallback(seenInSubArray);
  },

  _composeAt: function(index) {
    var op = this._operations[index],
        otherOp;

    if (!op) {
      // Composing out of bounds is a no-op, as when removing the last operation
      // in the list.
      return;
    }

    if (index > 0) {
      otherOp = this._operations[index-1];
      if (otherOp.type === op.type) {
        op.count += otherOp.count;
        this._operations.splice(index-1, 1);
        --index;
      }
    }

    if (index < this._operations.length-1) {
      otherOp = this._operations[index+1];
      if (otherOp.type === op.type) {
        op.count += otherOp.count;
        this._operations.splice(index+1, 1);
      }
    }
  },

  toString: function () {
    var str = "";
    forEach(this._operations, function (operation) {
      str += " " + operation.type + ":" + operation.count;
    });
    return str.substring(1);
  }
};
