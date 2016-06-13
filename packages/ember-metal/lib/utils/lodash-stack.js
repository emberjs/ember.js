// jshint eqeqeq:false
// jshint laxbreak:true

import EmptyObject from '../empty_object';

/*
 From Lodash's private Stack/Hash/MapCache/ListCache here:

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

const LARGE_ARRAY_SIZE = 200;
const HASH_UNDEFINED = '__lodash_hash_undefined__';

function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
  : data.map;
}

function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (array[length][0] === key) {
      return length;
    }
  }

  return -1;
}

export class Hash {
  constructor(entries) {
    let index = -1;
    let length = entries ? entries.length : 0;

    this.clear();

    while (++index < length) {
      let entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  clear() {
    this.__data__ = new EmptyObject();
  }

  delete(key) {
    return this.has(key) && delete this.__data__[key];
  }

  get(key) {
    let data = this.__data__;
    let result = data[key];

    return result === HASH_UNDEFINED ? undefined : result;
  }

  has(key) {
    let data = this.__data__;
    return data[key] !== undefined;
  }

  set(key, value) {
    var data = this.__data__;
    data[key] = value === undefined ? HASH_UNDEFINED : value;
  }

  forEach(callback) {
    let data = this.__data__;
    for (let key in data) {
      callback(key, data[key]);
    }
  }
}

export class MapCache {
  constructor(entries) {
    let index = -1;
    let length = entries ? entries.length : 0;

    this.clear();

    while (++index < length) {
      let entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  clear() {
    this.__data__ = {
      'hash': new Hash(),
      // TODO: use native Map if present
      'map': new ListCache(),
      'string': new Hash()
    };
  }

  delete(key) {
    return getMapData(this, key)['delete'](key);
  }

  get(key) {
    return getMapData(this, key).get(key);
  }

  has(key) {
    return getMapData(this, key).has(key);
  }

  set(key, value) {
    getMapData(this, key).set(key, value);
  }

  forEach(callback) {
    this.__data__.hash.forEach(callback);
    this.__data__.map.forEach(callback);
    this.__data__.string.forEach(callback);
  }
}

export class ListCache {
  constructor(entries) {
    let index = -1;
    let length = entries ? entries.length : 0;

    this.clear();

    while (++index < length) {
      let entry = entries[index];
      this.set(entry[0], entry[1]);
    }
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
    if (index == lastIndex) {
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
  }

  forEach(callback) {
    let index = -1;

    while (++index < this.__data__.length) {
      callback.apply(null, this.__data__[index]);
    }
  }
}

export default class Stack {
  constructor() {
    this.__data__ = new ListCache();
  }

  clear() {
    this.__data__ = new ListCache();
  }

  delete(key) {
    return this.__data__.delete(key);
  }

  get(key) {
    return this.__data__.get(key);
  }

  has(key) {
    return this.__data__.has(key);
  }

  set(key, value) {
    let cache = this.__data__;
    if (cache instanceof ListCache && cache.__data__.length == LARGE_ARRAY_SIZE) {
      cache = this.__data__ = new MapCache(cache.__data__);
    }
    cache.set(key, value);
  }

  /*
   This is not included in the lodash Stack interface
   but is required to support all the operations of Meta.
   */
  forEach(callback) {
    this.__data__.forEach(callback);
  }
}
