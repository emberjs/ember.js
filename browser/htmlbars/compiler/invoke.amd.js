define(
  ["exports"],
  function(__exports__) {
    "use strict";
    function call(func) {
      if (typeof func.join === 'function') {
        func = func.join('.');
      }

      var params = [].slice.call(arguments, 1);
      return func + "(" + params.join(", ") + ")";
    }


    function helper() {
      var args = [].slice.call(arguments, 0);
      args[0] = 'dom.' + args[0];
      return call.apply(this, args);
    }
    __exports__.call = call;
    __exports__.helper = helper;
  });
