import { check } from '@glimmer/debug';
import { createIteratorRef, valueForRef } from '@glimmer/reference';
import { Op } from '@glimmer/vm';

import { APPEND_OPCODES } from '../../opcodes';
import { CheckIterator, CheckReference } from './-debug-strip';
import { AssertFilter } from './vm';

APPEND_OPCODES.add(Op.EnterList, (vm, { op1: relativeStart, op2: elseTarget }) => {
  let stack = vm.stack;
  let listRef = check(stack.pop(), CheckReference);
  let keyRef = check(stack.pop(), CheckReference);

  let keyValue = valueForRef(keyRef);
  let key = keyValue === null ? '@identity' : String(keyValue);

  let iteratorRef = createIteratorRef(listRef, key);
  let iterator = valueForRef(iteratorRef);

  vm.updateWith(new AssertFilter(iteratorRef, (iterator) => iterator.isEmpty()));

  if (iterator.isEmpty() === true) {
    // TODO: Fix this offset, should be accurate
    vm.goto(elseTarget + 1);
  } else {
    vm.enterList(iteratorRef, relativeStart);
    vm.stack.push(iterator);
  }
});

APPEND_OPCODES.add(Op.ExitList, (vm) => {
  vm.exitList();
});

APPEND_OPCODES.add(Op.Iterate, (vm, { op1: breaks }) => {
  let stack = vm.stack;
  let iterator = check(stack.peek(), CheckIterator);
  let item = iterator.next();

  if (item !== null) {
    vm.registerItem(vm.enterItem(item));
  } else {
    vm.goto(breaks);
  }
});
