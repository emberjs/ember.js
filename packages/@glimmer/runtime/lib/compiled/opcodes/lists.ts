import {
  VM_ENTER_LIST_OP,
  VM_EXIT_LIST_OP,
  VM_ITERATE_OP,
} from '@glimmer/constants/lib/syscall-ops';
import { check } from '@glimmer/debug/lib/stack-check';
import { createIteratorRef } from '@glimmer/reference/lib/iterable';
import { valueForRef } from '@glimmer/reference/lib/reference';

import { syscall } from '../../opcodes';
import { enterItem, enterList, exitList, registerItem } from '../../vm/lists';
import { CheckIterator, CheckReference } from './-debug-strip';
import { AssertFilter } from './vm';

export const ENTER_LIST_OP = /*#__PURE__*/ syscall(
  VM_ENTER_LIST_OP,
  (vm, { op1: relativeStart, op2: elseTarget }) => {
    let stack = vm.stack;
    let listRef = check(stack.pop(), CheckReference);
    let keyRef = check(stack.pop(), CheckReference);

    let keyValue = valueForRef(keyRef);
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- @fixme
    let key = keyValue === null ? '@identity' : String(keyValue);

    let iteratorRef = createIteratorRef(listRef, key);
    let iterator = valueForRef(iteratorRef);

    vm.updateWith(new AssertFilter(iteratorRef, (iterator) => iterator.isEmpty()));

    if (iterator.isEmpty()) {
      // TODO: Fix this offset, should be accurate
      vm.lowlevel.goto(elseTarget + 1);
    } else {
      enterList(vm, iteratorRef, relativeStart);
      vm.stack.push(iterator);
    }
  }
);

export const EXIT_LIST_OP = /*#__PURE__*/ syscall(VM_EXIT_LIST_OP, (vm) => {
  exitList(vm);
});

export const ITERATE_OP = /*#__PURE__*/ syscall(VM_ITERATE_OP, (vm, { op1: breaks }) => {
  let stack = vm.stack;
  let iterator = check(stack.peek(), CheckIterator);
  let item = iterator.next();

  if (item !== null) {
    registerItem(vm, enterItem(vm, item));
  } else {
    vm.lowlevel.goto(breaks);
  }
});
