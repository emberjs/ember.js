define(
  ["exports"],
  function(__exports__) {
    "use strict";
    function pushElement(compiler) {
      return "element" + (++compiler.elementNumber);
    }


    function popElement(compiler) {
      return "element" + (compiler.elementNumber--);
    }


    function topElement(compiler) {
      return "element" + compiler.elementNumber;
    }


    __exports__.pushElement = pushElement;
    __exports__.popElement = popElement;
    __exports__.topElement = topElement;
  });
