var map, forEach, indexOf, splice, filter;
require('ember-metal/array');

map     = Array.prototype.map     || Ember.ArrayPolyfills.map;
forEach = Array.prototype.forEach || Ember.ArrayPolyfills.forEach;
indexOf = Array.prototype.indexOf || Ember.ArrayPolyfills.indexOf;
filter = Array.prototype.filter || Ember.ArrayPolyfills.filter;
splice = Array.prototype.splice;

var utils = Ember.EnumerableUtils = {
  map: function(obj, callback, thisArg) {
    return obj.map ? obj.map.call(obj, callback, thisArg) : map.call(obj, callback, thisArg);
  },

  forEach: function(obj, callback, thisArg) {
    return obj.forEach ? obj.forEach.call(obj, callback, thisArg) : forEach.call(obj, callback, thisArg);
  },

  filter: function(obj, callback, thisArg) {
    return obj.filter ? obj.filter.call(obj, callback, thisArg) : filter.call(obj, callback, thisArg);
  },

  indexOf: function(obj, element, index) {
    return obj.indexOf ? obj.indexOf.call(obj, element, index) : indexOf.call(obj, element, index);
  },

  indexesOf: function(obj, elements) {
    return elements === undefined ? [] : utils.map(elements, function(item) {
      return utils.indexOf(obj, item);
    });
  },

  addObject: function(array, item) {
    var index = utils.indexOf(array, item);
    if (index === -1) { array.push(item); }
  },

  removeObject: function(array, item) {
    var index = utils.indexOf(array, item);
    if (index !== -1) { array.splice(index, 1); }
  },

  _replace: function(array, idx, amt, objects) {
    var args = [].concat(objects), chunk, ret = [],
        // https://code.google.com/p/chromium/issues/detail?id=56588
        size = 60000, start = idx, ends = amt, count;

    while (args.length) {
      count = ends > size ? size : ends;
      if (count <= 0) { count = 0; }

      chunk = args.splice(0, size);
      chunk = [start, count].concat(chunk);

      start += size;
      ends -= count;

      ret = ret.concat(splice.apply(array, chunk));
    }
    return ret;
  },

  replace: function(array, idx, amt, objects) {
    if (array.replace) {
      return array.replace(idx, amt, objects);
    } else {
      return utils._replace(array, idx, amt, objects);
    }
  },

  intersection: function(array1, array2) {
    var intersection = [];

    utils.forEach(array1, function(element) {
      if (utils.indexOf(array2, element) >= 0) {
        intersection.push(element);
      }
    });

    return intersection;
  }
};
