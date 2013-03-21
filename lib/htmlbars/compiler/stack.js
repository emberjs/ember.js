function pushStack(compiler) {
  var stack = compiler.stack,
      stackNumber = "stack" + (++compiler.stackNumber);

  stack.push({ literal: false, value: stackNumber });
}

export { pushStack };

function pushStackLiteral(compiler, literal) {
  compiler.stack.push({ literal: true, value: literal });
}

export { pushStackLiteral };

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
