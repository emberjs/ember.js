define(
  ["exports"],
  function(__exports__) {
    "use strict";
    // this file exists in anticipation of a more involved
    // stack implementation involving temporary variables

    var __export1__ = function pushStack(stack, literal) {
      stack.push({ literal: true, value: literal });
    }

    var __export2__ = function popStack(stack) {
      var poppedValue = stack.pop();
      return poppedValue.value;
    }
    __exports__.pushStack = __export1__;
    __exports__.popStack = __export2__;
  });
