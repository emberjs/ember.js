// this file exists in anticipation of a more involved
// stack implementation involving temporary variables

function pushStack(stack, literal) {
  stack.push({ literal: true, value: literal });
}

export { pushStack };

function popStack(stack) {
  var poppedValue = stack.pop();
  return poppedValue.value;
}

export { popStack };