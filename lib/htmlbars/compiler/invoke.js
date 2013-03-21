function call(func) {
  if (typeof func.join === 'function') {
    func = func.join('.');
  }

  var params = [].slice.call(arguments, 1);
  return func + "(" + params.join(", ") + ")";
}

export { call };

function helper() {
  var args = [].slice.call(arguments, 0);
  args[0] = 'dom.' + args[0];
  return call.apply(this, args);
}

export { helper };