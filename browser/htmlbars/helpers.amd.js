define(
  ["exports"],
  function(__exports__) {
    "use strict";
    var helpers = {};

    var __export1__ = function registerHelper(name, callback) {
      helpers[name] = callback;
    }

    var __export2__ = function removeHelper(name) {
      delete helpers[name];
    }

    __exports__.registerHelper = __export1__;
    __exports__.removeHelper = __export2__;
    __exports__.helpers = helpers;
  });
