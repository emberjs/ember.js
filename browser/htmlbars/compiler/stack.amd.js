define(
  ["exports"],
  function(__exports__) {
    "use strict";
    // this file exists in anticipation of a more involved
    // stack implementation involving temporary variables

    function pushStack(stack, literal) {
      stack.push({ literal: true, value: literal });
    }


    function popStack(stack) {
      var poppedValue = stack.pop();
      return poppedValue.value;
    }

    __exports__.pushStack = pushStack;
    __exports__.popStack = popStack;
  });
