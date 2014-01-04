// this file exists in anticipation of a more involved
// stack implementation involving temporary variables

export function pushStack(stack, literal) {
  stack.push(literal);
}

export function popStack(stack) {
  return stack.pop();
}
