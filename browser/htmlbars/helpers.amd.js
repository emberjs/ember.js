define(
  ["exports"],
  function(__exports__) {
    "use strict";
    var helpers = {};

    function registerHelper(name, callback) {
      helpers[name] = callback;
    }

    function removeHelper(name) {
      delete helpers[name];
    }

    __exports__.registerHelper = registerHelper;
    __exports__.removeHelper = removeHelper;
    __exports__.helpers = helpers;
  });
