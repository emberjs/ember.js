define(
  ["exports"],
  function(__exports__) {
    "use strict";
    var __export1__ = function pushElement(compiler) {
      return "element" + (++compiler.elementNumber);
    }

    var __export2__ = function popElement(compiler) {
      return "element" + (compiler.elementNumber--);
    }

    var __export3__ = function topElement(compiler) {
      return "element" + compiler.elementNumber;
    }
    __exports__.pushElement = __export1__;
    __exports__.popElement = __export2__;
    __exports__.topElement = __export3__;
  });
