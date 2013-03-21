function pushStack(stack, literal) {
  stack.push({ literal: true, value: literal });
}

export { pushStack };

function popStack(stack) {
  var poppedValue = stack.pop();
  return poppedValue.value;
}

export { popStack };

function topStack(compiler) {
  return stack[stack.length - 1].value;
}

export { topStack };