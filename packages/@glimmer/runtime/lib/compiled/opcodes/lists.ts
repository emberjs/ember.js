import {
  VM_ENTER_LIST_OP,
  VM_EXIT_LIST_OP,
  VM_ITERATE_OP,
} from '@glimmer/constants/lib/syscall-ops';
import { check } from '@glimmer/debug/lib/stack-check';
import { createIteratorRef } from '@glimmer/reference/lib/iterable';
import { valueForRef } from '@glimmer/reference/lib/reference';

import type { AppendOpcodes } from '../../opcodes';
import { CheckIterator, CheckReference } from './-debug-strip';
import { AssertFilter } from './vm';

export function defineListOpcodes(APPEND_OPCODES: AppendOpcodes): void {
  APPEND_OPCODES.add(VM_ENTER_LIST_OP, (vm, { op1: relativeStart, op2: elseTarget }) => {
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
      vm.enterList(iteratorRef, relativeStart);
      vm.stack.push(iterator);
    }
  });

  APPEND_OPCODES.add(VM_EXIT_LIST_OP, (vm) => {
    vm.exitList();
  });

  APPEND_OPCODES.add(VM_ITERATE_OP, (vm, { op1: breaks }) => {
    let stack = vm.stack;
    let iterator = check(stack.peek(), CheckIterator);
    let item = iterator.next();

    if (item !== null) {
      vm.registerItem(vm.enterItem(item));
    } else {
      vm.lowlevel.goto(breaks);
    }
  });
}
