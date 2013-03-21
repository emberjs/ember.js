function invokeMethod(receiver, method) {
  var params = [].slice.call(arguments, 2);
  return receiver + "." + method + "(" + params.join(", ") + ")";
}

export { invokeMethod };

function invokeFunction(func) {
  var params = [].slice.call(arguments, 1);
  return func + "(" + params.join(", ") + ")";
}

export { invokeFunction };

function helper() {
  var args = [].slice.call(arguments, 0);
  args.unshift('dom');
  return invokeMethod.apply(this, args);
}

export { helper };