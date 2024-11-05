import type { CompilableTemplate, Nullable, UpdatingOpcode } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import type { Revision, Tag } from '@glimmer/validator';
import {
  decodeHandle,
  decodeImmediate,
  isHandle,
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
  VM_JUMP_IF_OP,
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
} from '@glimmer/constants';
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
} from '@glimmer/debug';
import { assert, expect, unwrap } from '@glimmer/debug-util';
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
} from '@glimmer/reference';
import {
  beginTrackFrame,
  CONSTANT_TAG,
  consumeTag,
  endTrackFrame,
  INITIAL,
  validateTag,
  valueForTag,
} from '@glimmer/validator';

import type { UpdatingVM } from '../../vm';
import type { VM } from '../../vm/append';

import { APPEND_OPCODES } from '../../opcodes';
import { VMArgumentsImpl } from '../../vm/arguments';
import { CheckReference, CheckScope } from './-debug-strip';
import { stackAssert } from './assert';

APPEND_OPCODES.add(VM_CHILD_SCOPE_OP, (vm) => vm.pushChildScope());

APPEND_OPCODES.add(VM_POP_SCOPE_OP, (vm) => vm.popScope());

APPEND_OPCODES.add(VM_PUSH_DYNAMIC_SCOPE_OP, (vm) => vm.pushDynamicScope());

APPEND_OPCODES.add(VM_POP_DYNAMIC_SCOPE_OP, (vm) => vm.popDynamicScope());

APPEND_OPCODES.add(VM_CONSTANT_OP, (vm, { op1: other }) => {
  vm.stack.push(vm.constants.getValue(decodeHandle(other)));
});

APPEND_OPCODES.add(VM_CONSTANT_REFERENCE_OP, (vm, { op1: other }) => {
  vm.stack.push(createConstRef(vm.constants.getValue(decodeHandle(other)), false));
});

APPEND_OPCODES.add(VM_PRIMITIVE_OP, (vm, { op1: primitive }) => {
  let stack = vm.stack;

  if (isHandle(primitive)) {
    // it is a handle which does not already exist on the stack
    let value = vm.constants.getValue(decodeHandle(primitive));
    stack.push(value as object);
  } else {
    // is already an encoded immediate or primitive handle
    stack.push(decodeImmediate(primitive));
  }
});

APPEND_OPCODES.add(VM_PRIMITIVE_REFERENCE_OP, (vm) => {
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

APPEND_OPCODES.add(VM_DUP_OP, (vm, { op1: register, op2: offset }) => {
  let position = check(vm.fetchValue(check(register, CheckRegister)), CheckNumber) - offset;
  vm.stack.dup(position);
});

APPEND_OPCODES.add(VM_POP_OP, (vm, { op1: count }) => {
  vm.stack.pop(count);
});

APPEND_OPCODES.add(VM_LOAD_OP, (vm, { op1: register }) => {
  vm.load(check(register, CheckSyscallRegister));
});

APPEND_OPCODES.add(VM_FETCH_OP, (vm, { op1: register }) => {
  vm.fetch(check(register, CheckSyscallRegister));
});

APPEND_OPCODES.add(VM_BIND_DYNAMIC_SCOPE_OP, (vm, { op1: _names }) => {
  let names = vm.constants.getArray<string>(_names);
  vm.bindDynamicScope(names);
});

APPEND_OPCODES.add(VM_ENTER_OP, (vm, { op1: args }) => {
  vm.enter(args);
});

APPEND_OPCODES.add(VM_EXIT_OP, (vm) => {
  vm.exit();
});

APPEND_OPCODES.add(VM_PUSH_SYMBOL_TABLE_OP, (vm, { op1: _table }) => {
  let stack = vm.stack;
  stack.push(vm.constants.getValue(_table));
});

APPEND_OPCODES.add(VM_PUSH_BLOCK_SCOPE_OP, (vm) => {
  let stack = vm.stack;
  stack.push(vm.scope());
});

APPEND_OPCODES.add(VM_COMPILE_BLOCK_OP, (vm: VM) => {
  let stack = vm.stack;
  let block = stack.pop<Nullable<CompilableTemplate> | 0>();

  if (block) {
    stack.push(vm.compile(block));
  } else {
    stack.push(null);
  }
});

APPEND_OPCODES.add(VM_INVOKE_YIELD_OP, (vm) => {
  let { stack } = vm;

  let handle = check(stack.pop(), CheckNullable(CheckHandle));
  let scope = check(stack.pop(), CheckNullable(CheckScope));
  let table = check(stack.pop(), CheckNullable(CheckBlockSymbolTable));

  assert(
    table === null || (table && typeof table === 'object' && Array.isArray(table.parameters)),
    stackAssert('Nullable<BlockSymbolTable>', table)
  );

  let args = check(stack.pop(), CheckInstanceof(VMArgumentsImpl));

  if (table === null || handle === null) {
    assert(
      handle === null && table === null,
      `Expected both handle and table to be null if either is null`
    );
    // To balance the pop{Frame,Scope}
    vm.pushFrame();
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

  vm.pushFrame();
  vm.pushScope(invokingScope);

  vm.call(handle);
});

APPEND_OPCODES.add(VM_JUMP_IF_OP, (vm, { op1: target }) => {
  let reference = check(vm.stack.pop(), CheckReference);
  let value = Boolean(valueForRef(reference));

  if (isConstRef(reference)) {
    if (value === true) {
      vm.goto(target);
    }
  } else {
    if (value === true) {
      vm.goto(target);
    }

    vm.updateWith(new Assert(reference));
  }
});

APPEND_OPCODES.add(VM_JUMP_UNLESS_OP, (vm, { op1: target }) => {
  let reference = check(vm.stack.pop(), CheckReference);
  let value = Boolean(valueForRef(reference));

  if (isConstRef(reference)) {
    if (value === false) {
      vm.goto(target);
    }
  } else {
    if (value === false) {
      vm.goto(target);
    }

    vm.updateWith(new Assert(reference));
  }
});

APPEND_OPCODES.add(VM_JUMP_EQ_OP, (vm, { op1: target, op2: comparison }) => {
  let other = check(vm.stack.peek(), CheckNumber);

  if (other === comparison) {
    vm.goto(target);
  }
});

APPEND_OPCODES.add(VM_ASSERT_SAME_OP, (vm) => {
  let reference = check(vm.stack.peek(), CheckReference);

  if (isConstRef(reference) === false) {
    vm.updateWith(new Assert(reference));
  }
});

APPEND_OPCODES.add(VM_TO_BOOLEAN_OP, (vm) => {
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
