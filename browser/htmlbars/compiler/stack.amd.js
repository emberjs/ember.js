define(
  ["exports"],
  function(__exports__) {
    "use strict";
    function pushStack(stack, literal) {
      stack.push({ literal: true, value: literal });
    }


    function popStack(stack) {
      var poppedValue = stack.pop();
      return poppedValue.value;
    }


    function topStack(compiler) {
      return stack[stack.length - 1].value;
    }

    __exports__.pushStack = pushStack;
    __exports__.popStack = popStack;
    __exports__.topStack = topStack;
  });
