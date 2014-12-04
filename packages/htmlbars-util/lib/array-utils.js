export function forEach(array, callback, binding) {
  var i;
  if (binding === undefined) {
    for (i = 0; i < array.length; i++) {
      callback(array[i], i, array);
    }
  } else {
    for (i = 0; i < array.length; i++) {
      callback.call(binding, array[i], i, array);
    }
  }
}
