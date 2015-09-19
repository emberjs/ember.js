export function forEach(array, callback, binding) {
  var i, l;
  if (binding === undefined) {
    for (i = 0, l = array.length; i < l; i++) {
      callback(array[i], i, array);
    }
  } else {
    for (i = 0, l = array.length; i < l; i++) {
      callback.call(binding, array[i], i, array);
    }
  }
}

export function map(array, callback) {
  var output = [];
  var i, l;

  for (i = 0, l = array.length; i < l; i++) {
    output.push(callback(array[i], i, array));
  }

  return output;
}

var getIdx;
if (Array.prototype.indexOf) {
  getIdx = function(array, obj, from){
    return array.indexOf(obj, from);
  };
} else {
  getIdx = function(array, obj, from) {
    if (from === undefined || from === null) {
      from = 0;
    } else if (from < 0) {
      from = Math.max(0, array.length + from);
    }
    for (var i = from, l= array.length; i < l; i++) {
      if (array[i] === obj) {
        return i;
      }
    }
    return -1;
  };
}

export var isArray = (Array.isArray || function(array) {
  return Object.prototype.toString.call(array) === '[object Array]';
});

export var indexOfArray = getIdx;
