import { Op } from '@glimmer/vm';
import { Opaque, Option, Recast } from '@glimmer/interfaces';
import {
  CONSTANT_TAG,
  isConst,
  isModified,
  ReferenceCache,
  Revision,
  Tag
} from '@glimmer/reference';
import { initializeGuid, assert } from '@glimmer/util';
import { expectStackChange, CheckNumber, check, CheckInstanceof, CheckOption, CheckBlockSymbolTable, CheckHandle, CheckPrimitive } from '@glimmer/debug';
import { stackAssert } from './assert';
import { APPEND_OPCODES, UpdatingOpcode } from '../../opcodes';
import { PrimitiveReference } from '../../references';
import { CompilableTemplate } from '../../syntax/interfaces';
import { VM, UpdatingVM } from '../../vm';
import { Arguments } from '../../vm/arguments';
import { LazyConstants, PrimitiveType } from "@glimmer/program";
import { VMHandle } from "@glimmer/opcode-compiler";
import { CheckReference } from './debug';

APPEND_OPCODES.add(Op.ChildScope, vm => vm.pushChildScope());

APPEND_OPCODES.add(Op.PopScope, vm => vm.popScope());

APPEND_OPCODES.add(Op.PushDynamicScope, vm => vm.pushDynamicScope());

APPEND_OPCODES.add(Op.PopDynamicScope, vm => vm.popDynamicScope());

APPEND_OPCODES.add(Op.Constant, (vm: VM<Opaque> & { constants: LazyConstants }, { op1: other }) => {
  vm.stack.push(vm.constants.getOther(other));
});

APPEND_OPCODES.add(Op.Primitive, (vm, { op1: primitive }) => {
  let stack = vm.stack;
  let flag = primitive & 7; // 111
  let value = primitive >> 3;

  switch (flag) {
    case PrimitiveType.NUMBER:
      stack.push(value);
      break;
    case PrimitiveType.FLOAT:
      stack.push(vm.constants.getFloat(value));
      break;
    case PrimitiveType.STRING:
      stack.push(vm.constants.getString(value));
      break;
    case PrimitiveType.BOOLEAN_OR_VOID:
      switch (value) {
        case 0: stack.push(false); break;
        case 1: stack.push(true); break;
        case 2: stack.push(null); break;
        case 3: stack.push(undefined); break;
      }
      break;
  }
});

APPEND_OPCODES.add(Op.PrimitiveReference, vm => {
  let stack = vm.stack;
  stack.push(PrimitiveReference.create(check(stack.pop(), CheckPrimitive)));
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
  let names = vm.constants.getArray(_names);
  vm.bindDynamicScope(names);
});

APPEND_OPCODES.add(Op.PushFrame, vm => {
  vm.pushFrame();

  check(vm.stack.peek(), CheckNumber);
  check(vm.stack.peek(1), CheckNumber);
});

APPEND_OPCODES.add(Op.PopFrame, vm => {
  vm.popFrame();
});

APPEND_OPCODES.add(Op.Enter, (vm, { op1: args }) => {
  vm.enter(args);
});

APPEND_OPCODES.add(Op.Exit, vm => {
  vm.exit();
});

APPEND_OPCODES.add(Op.PushSymbolTable, (vm, { op1: _table }) => {
  let stack = vm.stack;
  stack.push(vm.constants.getSymbolTable(_table));
});

APPEND_OPCODES.add(Op.CompileBlock, vm => {
  let stack = vm.stack;
  let block = stack.pop<Option<CompilableTemplate> | 0>();
  stack.push(block ? block.compile() : null);

  check(vm.stack.peek(), CheckOption(CheckNumber));
});

APPEND_OPCODES.add(Op.InvokeVirtual, vm => {
  vm.call(check(vm.stack.pop(), CheckHandle));
});

APPEND_OPCODES.add(Op.InvokeStatic, (vm, { op1: handle }) => {
  vm.call(handle as Recast<number, VMHandle>);
});

APPEND_OPCODES.add(Op.InvokeYield, vm => {
  let { stack } = vm;

  let handle = check(stack.pop(), CheckOption(CheckHandle));
  let table = check(stack.pop(), CheckOption(CheckBlockSymbolTable));

  assert(table === null || (table && typeof table === 'object' && Array.isArray(table.parameters)), stackAssert('Option<BlockSymbolTable>', table));

  let args = check(stack.pop(), CheckInstanceof(Arguments));

  if (table === null) {
    args.clear();

    // To balance the pop{Frame,Scope}
    vm.pushFrame();
    vm.pushCallerScope();

    return;
  }

  let locals = table.parameters;
  let localsCount = locals.length;

  vm.pushCallerScope(localsCount > 0);

  let scope = vm.scope();

  for (let i=0; i<localsCount; i++) {
    scope.bindSymbol(locals![i], args.at(i));
  }

  args.clear();

  vm.pushFrame();
  vm.call(handle!);
});

APPEND_OPCODES.add(Op.Jump, (vm, { op1: target }) => {
  vm.goto(target);
});

APPEND_OPCODES.add(Op.JumpIf, (vm, { op1: target }) => {
  let reference = check(vm.stack.pop(), CheckReference);

  if (isConst(reference)) {
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

  if (isConst(reference)) {
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

APPEND_OPCODES.add(Op.Return, vm => {
  vm.return();

  expectStackChange(vm.stack, 0, 'Return');
});

APPEND_OPCODES.add(Op.ReturnTo, (vm, { op1: relative }) => {
  vm.returnTo(relative);
});

APPEND_OPCODES.add(Op.ToBoolean, vm => {
  let { env, stack } = vm;
  stack.push(env.toConditionalReference(check(stack.pop(), CheckReference)));
});

export class Assert extends UpdatingOpcode {
  public type = 'assert';

  public tag: Tag;

  private cache: ReferenceCache<Opaque>;

  constructor(cache: ReferenceCache<Opaque>) {
    super();
    this.tag = cache.tag;
    this.cache = cache;
  }

  evaluate(vm: UpdatingVM<Opaque>) {
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
    this.lastRevision = tag.value();
  }

  evaluate(vm: UpdatingVM) {
    let { tag, target, lastRevision } = this;

    if (!vm.alwaysRevalidate && tag.validate(lastRevision)) {
      vm.goto(target);
    }
  }

  didModify() {
    this.lastRevision = this.tag.value();
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
  public _guid: number;

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
