define(
  ["exports"],
  function(__exports__) {
    "use strict";
    function pushStack(compiler, literal) {
      compiler.stack.push({ literal: true, value: literal });
    }


    function popStack(compiler) {
      var stack = compiler.stack,
          poppedValue = stack.pop();

      if (!poppedValue.literal) {
        stackNumber--;
      }
      return poppedValue.value;
    }


    function topStack(compiler) {
      var stack = compiler.stack;

      return stack[stack.length - 1].value;
    }


    __exports__.pushStack = pushStack;
    __exports__.popStack = popStack;
    __exports__.topStack = topStack;
  });
