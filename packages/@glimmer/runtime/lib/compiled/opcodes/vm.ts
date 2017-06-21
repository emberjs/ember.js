import { Opaque, Option, SymbolTable } from '@glimmer/interfaces';
import { ConstReference, Reference, VersionedPathReference } from '@glimmer/reference';
import {
  CONSTANT_TAG,
  isConst,
  isModified,
  ReferenceCache,
  Revision,
  Tag,
} from '@glimmer/reference';
import { initializeGuid } from '@glimmer/util';
import Environment from '../../environment';
import { APPEND_OPCODES, Op, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { Block } from '../../syntax/interfaces';
import { UpdatingVM, VM } from '../../vm';
import { CompiledDynamicTemplate } from '../blocks';

import {
  FALSE_REFERENCE,
  NULL_REFERENCE,
  PrimitiveReference,
  TRUE_REFERENCE,
  UNDEFINED_REFERENCE,
} from '../../references';

APPEND_OPCODES.add(Op.ChildScope, vm => vm.pushChildScope());

APPEND_OPCODES.add(Op.PopScope, vm => vm.popScope());

APPEND_OPCODES.add(Op.PushDynamicScope, vm => vm.pushDynamicScope());

APPEND_OPCODES.add(Op.PopDynamicScope, vm => vm.popDynamicScope());

APPEND_OPCODES.add(Op.Immediate, (vm, { op1: number }) => {
  vm.stack.push(number);
});

APPEND_OPCODES.add(Op.Constant, (vm, { op1: other }) => {
  vm.stack.push(vm.constants.getOther(other));
});

APPEND_OPCODES.add(Op.PrimitiveReference, (vm, { op1: primitive }) => {
  let stack = vm.stack;
  let flag = (primitive & (3 << 30)) >>> 30;
  let value = primitive & ~(3 << 30);

  switch (flag) {
    case 0:
      stack.push(PrimitiveReference.create(value));
      break;
    case 1:
      stack.push(PrimitiveReference.create(vm.constants.getString(value)));
      break;
    case 2:
      switch (value) {
        case 0: stack.push(FALSE_REFERENCE); break;
        case 1: stack.push(TRUE_REFERENCE); break;
        case 2: stack.push(NULL_REFERENCE); break;
        case 3: stack.push(UNDEFINED_REFERENCE); break;
      }
      break;
  }
});

APPEND_OPCODES.add(Op.Dup, (vm, { op1: register, op2: offset }) => {
  let position = vm.fetchValue<number>(register) - offset;
  vm.stack.dup(position);
});

APPEND_OPCODES.add(Op.Pop, (vm, { op1: count }) => vm.stack.pop(count));

APPEND_OPCODES.add(Op.Load, (vm, { op1: register }) => vm.load(register));

APPEND_OPCODES.add(Op.Fetch, (vm, { op1: register }) => vm.fetch(register));

APPEND_OPCODES.add(Op.BindDynamicScope, (vm, { op1: _names }) => {
  let names = vm.constants.getArray(_names);
  vm.bindDynamicScope(names);
});

APPEND_OPCODES.add(Op.PushFrame, vm => vm.pushFrame());

APPEND_OPCODES.add(Op.PopFrame, vm => vm.popFrame());

APPEND_OPCODES.add(Op.Enter, (vm, { op1: args }) => vm.enter(args));

APPEND_OPCODES.add(Op.Exit, (vm) => vm.exit());

APPEND_OPCODES.add(Op.CompileDynamicBlock, vm => {
  let stack = vm.stack;
  let block = stack.pop<Block>();
  stack.push(block ? block.compileDynamic(vm.env) : null);
});

APPEND_OPCODES.add(Op.InvokeStatic, (vm, { op1: _block }) => {
  let block = vm.constants.getBlock(_block);
  let compiled = block.compileStatic(vm.env);
  vm.call(compiled.handle);
});

export interface DynamicInvoker<S extends SymbolTable> {
  invoke(vm: VM, block: Option<CompiledDynamicTemplate<S>>): void;
}

APPEND_OPCODES.add(Op.InvokeDynamic, (vm, { op1: _invoker }) => {
  let invoker = vm.constants.getOther<DynamicInvoker<SymbolTable>>(_invoker);
  let block = vm.stack.pop<Option<CompiledDynamicTemplate<SymbolTable>>>();
  invoker.invoke(vm, block);
});

APPEND_OPCODES.add(Op.Jump, (vm, { op1: target }) => vm.goto(target));

APPEND_OPCODES.add(Op.JumpIf, (vm, { op1: target }) => {
  let reference = vm.stack.pop<VersionedPathReference<Opaque>>();

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
  let reference = vm.stack.pop<VersionedPathReference<Opaque>>();

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

APPEND_OPCODES.add(Op.Return, vm => vm.return());
APPEND_OPCODES.add(Op.ReturnTo, (vm, { op1: relative }) => {
  vm.returnTo(relative);
});

export type TestFunction = (ref: Reference<Opaque>, env: Environment) => Reference<boolean>;

export const ConstTest: TestFunction = function(ref: Reference<Opaque>, _env: Environment): Reference<boolean> {
  return new ConstReference(!!ref.value());
};

export const SimpleTest: TestFunction = function(ref: Reference<Opaque>, _env: Environment): Reference<boolean> {
  return ref as Reference<boolean>;
};

export const EnvironmentTest: TestFunction = function(ref: Reference<Opaque>, env: Environment): Reference<boolean> {
  return env.toConditionalReference(ref);
};

APPEND_OPCODES.add(Op.Test, (vm, { op1: _func }) => {
  let stack = vm.stack;
  let operand = stack.pop();
  let func = vm.constants.getFunction(_func);
  stack.push(func(operand, vm.env));
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

  evaluate(vm: UpdatingVM) {
    let { cache } = this;

    if (isModified(cache.revalidate())) {
      vm.throw();
    }
  }

  toJSON(): OpcodeJSON {
    let { type, _guid, cache } = this;

    let expected: string;

    try {
      expected = JSON.stringify(cache.peek());
    } catch (e) {
      expected = String(cache.peek());
    }

    return {
      args: [],
      details: { expected },
      guid: _guid,
      type,
    };
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

  toJSON(): OpcodeJSON {
    return {
      args: [JSON.stringify(this.target.inspect())],
      guid: this._guid,
      type: this.type,
    };
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

  toJSON(): OpcodeJSON {
    return {
      args: [JSON.stringify(this.inspect())],
      guid: this._guid,
      type: this.type,
    };
  }
}
