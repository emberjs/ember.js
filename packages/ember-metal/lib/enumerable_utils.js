var map, forEach, indexOf;
require('ember-metal/array');

map     = Array.prototype.map     || Ember.ArrayPolyfills.map;
forEach = Array.prototype.forEach || Ember.ArrayPolyfills.forEach;
indexOf = Array.prototype.indexOf || Ember.ArrayPolyfills.indexOf;

var utils = Ember.EnumerableUtils = {
  map: function(obj, callback, thisArg) {
    return obj.map ? obj.map.call(obj, callback, thisArg) : map.call(obj, callback, thisArg);
  },

  forEach: function(obj, callback, thisArg) {
    return obj.forEach ? obj.forEach.call(obj, callback, thisArg) : forEach.call(obj, callback, thisArg);
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

  replace: function(array, idx, amt, objects) {
    if (array.replace) {
      return array.replace(idx, amt, objects);
    } else {
      var args = [].concat(objects), chunk,
          // https://code.google.com/p/chromium/issues/detail?id=56588
          size = 62400, start = idx, ends = amt, count;

      while (args.length) {
        count = ends > size ? size : ends;
        if (count <= 0) { count = 0; }

        chunk = args.splice(0, size);
        chunk = [start, count].concat(chunk);

        start += size;
        ends -= count;

        array.splice.apply(array, chunk);
      }
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
