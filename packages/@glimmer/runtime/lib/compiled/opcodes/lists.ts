import { IterableReference } from '@glimmer/reference';
import { APPEND_OPCODES } from '../../opcodes';
import { CheckPathReference } from './-debug-strip';
import { check, CheckInstanceof } from '@glimmer/debug';
import { Op } from '@glimmer/interfaces';

APPEND_OPCODES.add(Op.PutIterator, vm => {
  let stack = vm.stack;
  let listRef = check(stack.pop(), CheckPathReference);
  let keyRef = check(stack.pop(), CheckPathReference);

  let keyValue = keyRef.value();
  let key = keyValue === null ? '@identity' : String(keyValue);

  let iterableRef = new IterableReference(listRef, key, vm.env);

  // Push the first time to push the iterator onto the stack for iteration
  stack.push(iterableRef);

  // Push the second time to push it as a reference for presence in general
  // (e.g whether or not it is empty). This reference will be used to skip
  // iteration entirely.
  stack.push(iterableRef);
});

APPEND_OPCODES.add(Op.EnterList, (vm, { op1: relativeStart }) => {
  vm.enterList(relativeStart);
});

APPEND_OPCODES.add(Op.ExitList, vm => {
  vm.exitList();
});

APPEND_OPCODES.add(Op.Iterate, (vm, { op1: breaks }) => {
  let stack = vm.stack;
  let iterable = check(stack.peek(), CheckInstanceof(IterableReference));
  let item = iterable.next();

  if (item) {
    let opcode = vm.enterItem(iterable, item);
    vm.registerItem(opcode);
  } else {
    vm.goto(breaks);
  }
});
