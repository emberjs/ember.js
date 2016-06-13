/*
 From Lodash's private ListCache here:

 https://github.com/lodash/lodash/blob/4.13.1/dist/lodash.js#L1790-L1900

 The long term plan is to replace this and simply utilize lodash itself (via
 rollup or other) in the build itself.

 ***********************************************************************
 * @license
 * lodash <https://lodash.com/>
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 ***********************************************************************

*/
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (array[length][0] === key) {
      return length;
    }
  }

  return -1;
}

export default class ListCache {
  constructor() {
    this.__data__ = [];
  }

  clear() {
    this.__data__ = [];
  }

  delete(key) {
    let data = this.__data__;
    let index = assocIndexOf(data, key);

    if (index < 0) {
      return false;
    }
    var lastIndex = data.length - 1;
    if (index == lastIndex) {     // jshint ignore:line
      data.pop();
    } else {
      data.splice(index, 1);
    }

    return true;
  }

  get(key) {
    let data = this.__data__;
    let index = assocIndexOf(data, key);

    return index < 0 ? undefined : data[index][1];
  }

  has(key) {
    return assocIndexOf(this.__data__, key) > -1;
  }

  set(key, value) {
    let data = this.__data__;
    let index = assocIndexOf(data, key);

    if (index < 0) {
      data.push([key, value]);
    } else {
      data[index][1] = value;
    }

    return this;
  }

  /*
   This is not included in the lodash ListCache/Stack interface
   but is required to support all the operations of Meta.
   */
  forEach(callback) {
    let index = -1;

    while (++index < this.__data__.length) {
      callback.apply(null, this.__data__[index]);
    }
  }
}
