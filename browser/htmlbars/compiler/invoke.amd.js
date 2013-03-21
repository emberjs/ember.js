define(
  ["exports"],
  function(__exports__) {
    "use strict";
    function invokeMethod(receiver, method) {
      var params = [].slice.call(arguments, 2);
      return receiver + "." + method + "(" + params.join(", ") + ")";
    }


    function invokeFunction(func) {
      var params = [].slice.call(arguments, 1);
      return func + "(" + params.join(", ") + ")";
    }


    function helper() {
      var args = [].slice.call(arguments, 0);
      args.unshift('dom');
      return invokeMethod.apply(this, args);
    }

    __exports__.invokeMethod = invokeMethod;
    __exports__.invokeFunction = invokeFunction;
    __exports__.helper = helper;
  });
