export function forEach(array, callback, binding) {
  var i, l;
  if (binding === undefined) {
    for (i=0, l=array.length; i<l; i++) {
      callback(array[i], i);
    }
  } else {
    for (i=0, l=array.length; i<l; i++) {
      callback.call(binding, array[i], i);
    }
  }
}
