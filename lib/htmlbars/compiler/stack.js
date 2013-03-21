function pushStack(compiler, literal) {
  compiler.stack.push({ literal: true, value: literal });
}

export { pushStack };

function popStack(compiler) {
  var stack = compiler.stack,
      poppedValue = stack.pop();

  if (!poppedValue.literal) {
    stackNumber--;
  }
  return poppedValue.value;
}

export { popStack };

function topStack(compiler) {
  var stack = compiler.stack;

  return stack[stack.length - 1].value;
}

export { topStack };
