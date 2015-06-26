var splice = Array.prototype.splice;

export function _replace(array, idx, amt, objects) {
  var args = [].concat(objects);
  var ret = [];
  // https://code.google.com/p/chromium/issues/detail?id=56588
  var size = 60000;
  var start = idx;
  var ends = amt;
  var count, chunk;

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
}

/**
  Replaces objects in an array with the passed objects.

  ```javascript
    var array = [1,2,3];
    replace(array, 1, 2, [4, 5]); // [1, 4, 5]

    var array = [1,2,3];
    replace(array, 1, 1, [4, 5]); // [1, 4, 5, 3]

    var array = [1,2,3];
    replace(array, 10, 1, [4, 5]); // [1, 2, 3, 4, 5]
  ```

  @method replace
  @deprecated
  @param {Array} array The array the objects should be inserted into.
  @param {Number} idx Starting index in the array to replace. If *idx* >=
  length, then append to the end of the array.
  @param {Number} amt Number of elements that should be removed from the array,
  starting at *idx*
  @param {Array} objects An array of zero or more objects that should be
  inserted into the array at *idx*

  @return {Array} The modified array.
  @public
*/
export default function replace(array, idx, amt, objects) {
  // TODO: FIXME
  if (array.replace) {
    return array.replace(idx, amt, objects);
  } else {
    return _replace(array, idx, amt, objects);
  }
}
