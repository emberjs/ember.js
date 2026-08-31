import type { CompilableTemplate, Nullable, UpdatingOpcode } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import type { Revision } from '@glimmer/validator/lib/validators';
import type { Tag } from '@glimmer/interfaces';
import { decodeHandle, decodeImmediate, isHandle } from '@glimmer/constants/lib/immediate';
import { DEBUG } from '@glimmer/env';
import {
  VM_ASSERT_SAME_OP,
  VM_BIND_DYNAMIC_SCOPE_OP,
  VM_CHILD_SCOPE_OP,
  VM_COMPILE_BLOCK_OP,
  VM_CONSTANT_OP,
  VM_CONSTANT_REFERENCE_OP,
  VM_DUP_OP,
  VM_ENTER_OP,
  VM_EXIT_OP,
  VM_FETCH_OP,
  VM_INVOKE_YIELD_OP,
  VM_JUMP_EQ_OP,
  VM_JUMP_UNLESS_OP,
  VM_LOAD_OP,
  VM_POP_DYNAMIC_SCOPE_OP,
  VM_POP_OP,
  VM_POP_SCOPE_OP,
  VM_PRIMITIVE_OP,
  VM_PRIMITIVE_REFERENCE_OP,
  VM_PUSH_BLOCK_SCOPE_OP,
  VM_PUSH_DYNAMIC_SCOPE_OP,
  VM_PUSH_SYMBOL_TABLE_OP,
  VM_TO_BOOLEAN_OP,
} from '@glimmer/constants/lib/syscall-ops';
import {
  check,
  CheckBlockSymbolTable,
  CheckHandle,
  CheckInstanceof,
  CheckNullable,
  CheckNumber,
  CheckPrimitive,
  CheckRegister,
  CheckSyscallRegister,
} from '@glimmer/debug/lib/stack-check';
import { expect, unwrap } from '@glimmer/debug-util/lib/platform-utils';
import assert from '@glimmer/debug-util/lib/assert';
import { toBool } from '@glimmer/global-context';
import {
  createComputeRef,
  createConstRef,
  createPrimitiveRef,
  FALSE_REFERENCE,
  isConstRef,
  NULL_REFERENCE,
  TRUE_REFERENCE,
  UNDEFINED_REFERENCE,
  valueForRef,
} from '@glimmer/reference/lib/reference';
import { beginTrackFrame, consumeTag, endTrackFrame } from '@glimmer/validator/lib/tracking';
import { CONSTANT_TAG, INITIAL, validateTag, valueForTag } from '@glimmer/validator/lib/validators';

import type { UpdatingVM } from '../../vm';
import type { VM } from '../../vm/append';

import { syscall } from '../../opcodes';
import { VMArgumentsImpl } from '../../vm/arguments';
import { CheckReference, CheckScope } from './-debug-strip';

export const CHILD_SCOPE_OP = /*#__PURE__*/ syscall(VM_CHILD_SCOPE_OP, (vm) => vm.pushChildScope());

export const POP_SCOPE_OP = /*#__PURE__*/ syscall(VM_POP_SCOPE_OP, (vm) => vm.popScope());

export const PUSH_DYNAMIC_SCOPE_OP = /*#__PURE__*/ syscall(VM_PUSH_DYNAMIC_SCOPE_OP, (vm) =>
  vm.pushDynamicScope()
);

export const POP_DYNAMIC_SCOPE_OP = /*#__PURE__*/ syscall(VM_POP_DYNAMIC_SCOPE_OP, (vm) =>
  vm.popDynamicScope()
);

export const CONSTANT_OP = /*#__PURE__*/ syscall(VM_CONSTANT_OP, (vm, { op1: other }) => {
  vm.stack.push(vm.constants.getValue(decodeHandle(other)));
});

export const CONSTANT_REFERENCE_OP = /*#__PURE__*/ syscall(VM_CONSTANT_REFERENCE_OP, (vm, op) => {
  let value = vm.constants.getValue(decodeHandle(op.op1));
  let label: string | false = false;

  // A second operand, present in debug builds, names the value.
  if (DEBUG && op.size > 2) {
    label = vm.constants.getValue<string>(decodeHandle(op.op2));
  }

  vm.stack.push(createConstRef(value, label));
});

export const PRIMITIVE_OP = /*#__PURE__*/ syscall(VM_PRIMITIVE_OP, (vm, { op1: primitive }) => {
  let stack = vm.stack;

  if (isHandle(primitive)) {
    // it is a handle which does not already exist on the stack
    let value = vm.constants.getValue(decodeHandle(primitive));
    stack.push(value);
  } else {
    // is already an encoded immediate or primitive handle
    stack.push(decodeImmediate(primitive));
  }
});

export const PRIMITIVE_REFERENCE_OP = /*#__PURE__*/ syscall(VM_PRIMITIVE_REFERENCE_OP, (vm) => {
  let stack = vm.stack;
  let value = check(stack.pop(), CheckPrimitive);
  let ref;

  if (value === undefined) {
    ref = UNDEFINED_REFERENCE;
  } else if (value === null) {
    ref = NULL_REFERENCE;
  } else if (value === true) {
    ref = TRUE_REFERENCE;
  } else if (value === false) {
    ref = FALSE_REFERENCE;
  } else {
    ref = createPrimitiveRef(value);
  }

  stack.push(ref);
});

export const DUP_OP = /*#__PURE__*/ syscall(VM_DUP_OP, (vm, { op1: register, op2: offset }) => {
  let position = check(vm.fetchValue(check(register, CheckRegister)), CheckNumber) - offset;
  vm.stack.dup(position);
});

export const POP_OP = /*#__PURE__*/ syscall(VM_POP_OP, (vm, { op1: count }) => {
  vm.stack.pop(count);
});

export const LOAD_OP = /*#__PURE__*/ syscall(VM_LOAD_OP, (vm, { op1: register }) => {
  vm.load(check(register, CheckSyscallRegister));
});

export const FETCH_OP = /*#__PURE__*/ syscall(VM_FETCH_OP, (vm, { op1: register }) => {
  vm.fetch(check(register, CheckSyscallRegister));
});

export const BIND_DYNAMIC_SCOPE_OP = /*#__PURE__*/ syscall(
  VM_BIND_DYNAMIC_SCOPE_OP,
  (vm, { op1: _names }) => {
    let names = vm.constants.getArray<string>(_names);
    vm.bindDynamicScope(names);
  }
);

export const ENTER_OP = /*#__PURE__*/ syscall(VM_ENTER_OP, (vm, { op1: args }) => {
  vm.enter(args);
});

export const EXIT_OP = /*#__PURE__*/ syscall(VM_EXIT_OP, (vm) => {
  vm.exit();
});

export const PUSH_SYMBOL_TABLE_OP = /*#__PURE__*/ syscall(
  VM_PUSH_SYMBOL_TABLE_OP,
  (vm, { op1: _table }) => {
    let stack = vm.stack;
    stack.push(vm.constants.getValue(_table));
  }
);

export const PUSH_BLOCK_SCOPE_OP = /*#__PURE__*/ syscall(VM_PUSH_BLOCK_SCOPE_OP, (vm) => {
  let stack = vm.stack;
  stack.push(vm.scope());
});

export const COMPILE_BLOCK_OP = /*#__PURE__*/ syscall(VM_COMPILE_BLOCK_OP, (vm: VM) => {
  let stack = vm.stack;
  let block = stack.pop<Nullable<CompilableTemplate> | 0>();

  if (block) {
    stack.push(vm.compile(block));
  } else {
    stack.push(null);
  }
});

export const INVOKE_YIELD_OP = /*#__PURE__*/ syscall(VM_INVOKE_YIELD_OP, (vm) => {
  let { stack } = vm;

  let handle = check(stack.pop(), CheckNullable(CheckHandle));
  let scope = check(stack.pop(), CheckNullable(CheckScope));
  let table = check(stack.pop(), CheckNullable(CheckBlockSymbolTable));

  let args = check(stack.pop(), CheckInstanceof(VMArgumentsImpl));

  if (table === null || handle === null) {
    assert(
      handle === null && table === null,
      `Expected both handle and table to be null if either is null`
    );
    // To balance the pop{Frame,Scope}
    vm.lowlevel.pushFrame();
    vm.pushScope(scope ?? vm.scope());

    return;
  }

  let invokingScope = expect(scope, 'BUG: expected scope');

  // If necessary, create a child scope
  {
    let locals = table.parameters;
    let localsCount = locals.length;

    if (localsCount > 0) {
      invokingScope = invokingScope.child();

      for (let i = 0; i < localsCount; i++) {
        invokingScope.bindSymbol(unwrap(locals[i]), args.at(i));
      }
    }
  }

  vm.lowlevel.pushFrame();
  vm.pushScope(invokingScope);

  vm.call(handle);
});

export const JUMP_UNLESS_OP = /*#__PURE__*/ syscall(VM_JUMP_UNLESS_OP, (vm, { op1: target }) => {
  let reference = check(vm.stack.pop(), CheckReference);
  let value = Boolean(valueForRef(reference));

  if (isConstRef(reference)) {
    if (!value) {
      vm.lowlevel.goto(target);
    }
  } else {
    if (!value) {
      vm.lowlevel.goto(target);
    }

    vm.updateWith(new Assert(reference));
  }
});

export const JUMP_EQ_OP = /*#__PURE__*/ syscall(
  VM_JUMP_EQ_OP,
  (vm, { op1: target, op2: comparison }) => {
    let other = check(vm.stack.peek(), CheckNumber);

    if (other === comparison) {
      vm.lowlevel.goto(target);
    }
  }
);

export const ASSERT_SAME_OP = /*#__PURE__*/ syscall(VM_ASSERT_SAME_OP, (vm) => {
  let reference = check(vm.stack.peek(), CheckReference);

  if (!isConstRef(reference)) {
    vm.updateWith(new Assert(reference));
  }
});

export const TO_BOOLEAN_OP = /*#__PURE__*/ syscall(VM_TO_BOOLEAN_OP, (vm) => {
  let { stack } = vm;
  let valueRef = check(stack.pop(), CheckReference);

  stack.push(createComputeRef(() => toBool(valueForRef(valueRef))));
});

export class Assert implements UpdatingOpcode {
  private last: unknown;

  constructor(private ref: Reference) {
    this.last = valueForRef(ref);
  }

  evaluate(vm: UpdatingVM) {
    let { last, ref } = this;
    let current = valueForRef(ref);

    if (last !== current) {
      vm.throw();
    }
  }
}

export class AssertFilter<T, U> implements UpdatingOpcode {
  private last: U;

  constructor(
    private ref: Reference<T>,
    private filter: (from: T) => U
  ) {
    this.last = filter(valueForRef(ref));
  }

  evaluate(vm: UpdatingVM) {
    let { last, ref, filter } = this;
    let current = filter(valueForRef(ref));

    if (last !== current) {
      vm.throw();
    }
  }
}

export class JumpIfNotModifiedOpcode implements UpdatingOpcode {
  private tag: Tag = CONSTANT_TAG;
  private lastRevision: Revision = INITIAL;
  private target?: number;

  finalize(tag: Tag, target: number) {
    this.target = target;
    this.didModify(tag);
  }

  evaluate(vm: UpdatingVM) {
    let { tag, target, lastRevision } = this;

    if (!vm.alwaysRevalidate && validateTag(tag, lastRevision)) {
      consumeTag(tag);
      vm.goto(expect(target, 'VM BUG: Target must be set before attempting to jump'));
    }
  }

  didModify(tag: Tag) {
    this.tag = tag;
    this.lastRevision = valueForTag(this.tag);
    consumeTag(tag);
  }
}

export class BeginTrackFrameOpcode implements UpdatingOpcode {
  constructor(private debugLabel?: string) {}

  evaluate() {
    beginTrackFrame(this.debugLabel);
  }
}

export class EndTrackFrameOpcode implements UpdatingOpcode {
  constructor(private target: JumpIfNotModifiedOpcode) {}

  evaluate() {
    let tag = endTrackFrame();
    this.target.didModify(tag);
  }
}
