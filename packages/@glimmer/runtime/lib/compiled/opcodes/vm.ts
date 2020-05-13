import { CompilableTemplate, Option, Op } from '@glimmer/interfaces';
import { isModified, ReferenceCache } from '@glimmer/reference';
import {
  CONSTANT_TAG,
  isConstTagged,
  Revision,
  Tag,
  valueForTag,
  validateTag,
} from '@glimmer/validator';
import { initializeGuid, assert, isHandle, HandleConstants, decodeHandle } from '@glimmer/util';
import {
  CheckNumber,
  check,
  CheckInstanceof,
  CheckOption,
  CheckBlockSymbolTable,
  CheckHandle,
  CheckPrimitive,
} from '@glimmer/debug';
import { stackAssert } from './assert';
import { APPEND_OPCODES, UpdatingOpcode } from '../../opcodes';
import { PrimitiveReference } from '../../references';
import { UpdatingVM } from '../../vm';
import { VMArgumentsImpl } from '../../vm/arguments';
import { CheckReference, CheckScope } from './-debug-strip';
import { CONSTANTS } from '../../symbols';
import { InternalJitVM } from '../../vm/append';

APPEND_OPCODES.add(Op.ChildScope, vm => vm.pushChildScope());

APPEND_OPCODES.add(Op.PopScope, vm => vm.popScope());

APPEND_OPCODES.add(Op.PushDynamicScope, vm => vm.pushDynamicScope());

APPEND_OPCODES.add(Op.PopDynamicScope, vm => vm.popDynamicScope());

APPEND_OPCODES.add(Op.Constant, (vm, { op1: other }) => {
  vm.stack.push(vm[CONSTANTS].getOther(other));
});

APPEND_OPCODES.add(Op.Primitive, (vm, { op1: primitive }) => {
  let stack = vm.stack;
  if (isHandle(primitive)) {
    let value: string | number;
    if (primitive > HandleConstants.NUMBER_MAX_HANDLE) {
      value = vm[CONSTANTS].getString(decodeHandle(primitive, HandleConstants.STRING_MAX_HANDLE));
    } else {
      value = vm[CONSTANTS].getNumber(decodeHandle(primitive, HandleConstants.NUMBER_MAX_HANDLE));
    }
    stack.pushJs(value);
  } else {
    // is already an encoded immediate
    stack.pushRaw(primitive);
  }
});

APPEND_OPCODES.add(Op.PrimitiveReference, vm => {
  let stack = vm.stack;
  stack.push(PrimitiveReference.create(check(stack.pop(), CheckPrimitive)));
});

APPEND_OPCODES.add(Op.ReifyU32, vm => {
  let stack = vm.stack;
  stack.push(check(stack.peek(), CheckReference).value());
});

APPEND_OPCODES.add(Op.Dup, (vm, { op1: register, op2: offset }) => {
  let position = check(vm.fetchValue(register), CheckNumber) - offset;
  vm.stack.dup(position);
});

APPEND_OPCODES.add(Op.Pop, (vm, { op1: count }) => {
  vm.stack.pop(count);
});

APPEND_OPCODES.add(Op.Load, (vm, { op1: register }) => {
  vm.load(register);
});

APPEND_OPCODES.add(Op.Fetch, (vm, { op1: register }) => {
  vm.fetch(register);
});

APPEND_OPCODES.add(Op.BindDynamicScope, (vm, { op1: _names }) => {
  let names = vm[CONSTANTS].getArray(_names);
  vm.bindDynamicScope(names);
});

APPEND_OPCODES.add(Op.Enter, (vm, { op1: args }) => {
  vm.enter(args);
});

APPEND_OPCODES.add(Op.Exit, vm => {
  vm.exit();
});

APPEND_OPCODES.add(Op.PushSymbolTable, (vm, { op1: _table }) => {
  let stack = vm.stack;
  stack.push(vm[CONSTANTS].getSerializable(_table));
});

APPEND_OPCODES.add(Op.PushBlockScope, vm => {
  let stack = vm.stack;
  stack.push(vm.scope());
});

APPEND_OPCODES.add(
  Op.CompileBlock,
  (vm: InternalJitVM) => {
    let stack = vm.stack;
    let block = stack.pop<Option<CompilableTemplate> | 0>();

    if (block) {
      stack.push(vm.compile(block));
    } else {
      stack.push(null);
    }

    check(vm.stack.peek(), CheckOption(CheckNumber));
  },
  'jit'
);

APPEND_OPCODES.add(Op.InvokeYield, vm => {
  let { stack } = vm;

  let handle = check(stack.pop(), CheckOption(CheckHandle));
  let scope = check(stack.pop(), CheckOption(CheckScope));
  let table = check(stack.pop(), CheckOption(CheckBlockSymbolTable));

  assert(
    table === null || (table && typeof table === 'object' && Array.isArray(table.parameters)),
    stackAssert('Option<BlockSymbolTable>', table)
  );

  let args = check(stack.pop(), CheckInstanceof(VMArgumentsImpl));

  if (table === null) {
    // To balance the pop{Frame,Scope}
    vm.pushFrame();
    vm.pushScope(scope!); // Could be null but it doesnt matter as it is immediatelly popped.
    return;
  }

  let invokingScope = scope!;

  // If necessary, create a child scope
  {
    let locals = table.parameters;
    let localsCount = locals.length;

    if (localsCount > 0) {
      invokingScope = invokingScope.child();

      for (let i = 0; i < localsCount; i++) {
        invokingScope.bindSymbol(locals![i], args.at(i));
      }
    }
  }

  vm.pushFrame();
  vm.pushScope(invokingScope);
  vm.call(handle!);
});

APPEND_OPCODES.add(Op.JumpIf, (vm, { op1: target }) => {
  let reference = check(vm.stack.pop(), CheckReference);

  if (isConstTagged(reference)) {
    if (reference.value()) {
      vm.goto(target);
    }
  } else {
    let cache = new ReferenceCache(reference);

    if (cache.peek()) {
      vm.goto(target);
    }

    vm.updateWith(new Assert(cache));
  }
});

APPEND_OPCODES.add(Op.JumpUnless, (vm, { op1: target }) => {
  let reference = check(vm.stack.pop(), CheckReference);

  if (isConstTagged(reference)) {
    if (!reference.value()) {
      vm.goto(target);
    }
  } else {
    let cache = new ReferenceCache(reference);

    if (!cache.peek()) {
      vm.goto(target);
    }

    vm.updateWith(new Assert(cache));
  }
});

APPEND_OPCODES.add(Op.JumpEq, (vm, { op1: target, op2: comparison }) => {
  let other = check(vm.stack.peek(), CheckNumber);

  if (other === comparison) {
    vm.goto(target);
  }
});

APPEND_OPCODES.add(Op.AssertSame, vm => {
  let reference = check(vm.stack.peek(), CheckReference);

  if (!isConstTagged(reference)) {
    vm.updateWith(Assert.initialize(new ReferenceCache(reference)));
  }
});

APPEND_OPCODES.add(Op.ToBoolean, vm => {
  let { env, stack } = vm;
  stack.push(env.toConditionalReference(check(stack.pop(), CheckReference)));
});

export class Assert extends UpdatingOpcode {
  static initialize(cache: ReferenceCache<unknown>): Assert {
    let assert = new Assert(cache);
    cache.peek();
    return assert;
  }

  public type = 'assert';

  public tag: Tag;

  private cache: ReferenceCache<unknown>;

  constructor(cache: ReferenceCache<unknown>) {
    super();
    this.tag = cache.tag;
    this.cache = cache;
  }

  evaluate(vm: UpdatingVM) {
    let { cache } = this;

    if (isModified(cache.revalidate())) {
      vm.throw();
    }
  }
}

export class JumpIfNotModifiedOpcode extends UpdatingOpcode {
  public type = 'jump-if-not-modified';

  public tag: Tag;

  private lastRevision: Revision;

  constructor(tag: Tag, private target: LabelOpcode) {
    super();
    this.tag = tag;
    this.lastRevision = valueForTag(tag);
  }

  evaluate(vm: UpdatingVM) {
    let { tag, target, lastRevision } = this;

    if (!vm.alwaysRevalidate && validateTag(tag, lastRevision)) {
      vm.goto(target);
    }
  }

  didModify() {
    this.lastRevision = valueForTag(this.tag);
  }
}

export class DidModifyOpcode extends UpdatingOpcode {
  public type = 'did-modify';

  public tag: Tag;

  constructor(private target: JumpIfNotModifiedOpcode) {
    super();
    this.tag = CONSTANT_TAG;
  }

  evaluate() {
    this.target.didModify();
  }
}

export class LabelOpcode implements UpdatingOpcode {
  public tag: Tag = CONSTANT_TAG;
  public type = 'label';
  public label: Option<string> = null;
  public _guid!: number; // Set by initializeGuid() in the constructor

  prev: any = null;
  next: any = null;

  constructor(label: string) {
    initializeGuid(this);
    this.label = label;
  }

  evaluate() {}

  inspect(): string {
    return `${this.label} [${this._guid}]`;
  }
}
