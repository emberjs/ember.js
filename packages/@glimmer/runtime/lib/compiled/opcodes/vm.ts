import { OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { CompiledExpression } from '../expressions';
import { CompiledArgs } from '../expressions/args';
import { UpdatingVM } from '../../vm';
import { Reference, ConstReference } from '@glimmer/reference';
import { Option, Opaque, initializeGuid } from '@glimmer/util';
import { CONSTANT_TAG, ReferenceCache, Revision, RevisionTag, isConst, isModified } from '@glimmer/reference';
import Environment from '../../environment';
import { APPEND_OPCODES, OpcodeName as Op } from '../../opcodes';

APPEND_OPCODES.add(Op.PushChildScope, vm => vm.pushChildScope());

APPEND_OPCODES.add(Op.PopScope, vm => vm.popScope());

APPEND_OPCODES.add(Op.PushDynamicScope, vm => vm.pushDynamicScope());

APPEND_OPCODES.add(Op.PopDynamicScope, vm => vm.popDynamicScope());

APPEND_OPCODES.add(Op.Put, (vm, { op1: reference }) => {
  vm.frame.setOperand(vm.constants.getReference(reference));
});

APPEND_OPCODES.add(Op.EvaluatePut, (vm, { op1: expression }) => {
  let expr = vm.constants.getExpression<CompiledExpression<Opaque>>(expression);
  vm.evaluateOperand(expr);
});

APPEND_OPCODES.add(Op.PutArgs, (vm, { op1: args }) => {
  vm.evaluateArgs(vm.constants.getExpression<CompiledArgs>(args));
});

APPEND_OPCODES.add(Op.BindPositionalArgs, (vm, { op1: _symbols }) => {
  let symbols = vm.constants.getArray(_symbols);
  vm.bindPositionalArgs(symbols);
});

APPEND_OPCODES.add(Op.BindNamedArgs, (vm, { op1: _names, op2: _symbols }) => {
  let names = vm.constants.getArray(_names);
  let symbols = vm.constants.getArray(_symbols);
  vm.bindNamedArgs(names, symbols);
});

APPEND_OPCODES.add(Op.BindBlocks, (vm, { op1: _names, op2: _symbols }) => {
  let names = vm.constants.getArray(_names);
  let symbols = vm.constants.getArray(_symbols);
  vm.bindBlocks(names, symbols);
});

APPEND_OPCODES.add(Op.BindPartialArgs, (vm, { op1: symbol }) => {
  vm.bindPartialArgs(symbol);
});

APPEND_OPCODES.add(Op.BindCallerScope, vm => vm.bindCallerScope());

APPEND_OPCODES.add(Op.BindDynamicScope, (vm, { op1: _names }) => {
  let names = vm.constants.getArray(_names);
  vm.bindDynamicScope(names);
});

APPEND_OPCODES.add(Op.Enter, (vm, { op1: slice }) => vm.enter(slice));

APPEND_OPCODES.add(Op.Exit, (vm) => vm.exit());

APPEND_OPCODES.add(Op.Evaluate, (vm, { op1: _block }) => {
  let block = vm.constants.getBlock(_block);
  let args = vm.frame.getArgs();
  vm.invokeBlock(block, args);
});

APPEND_OPCODES.add(Op.Jump, (vm, { op1: target }) => vm.goto(target));

APPEND_OPCODES.add(Op.JumpIf, (vm, { op1: target }) => {
  let reference = vm.frame.getCondition();

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
  let reference = vm.frame.getCondition();

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
  let operand = vm.frame.getOperand();
  let func = vm.constants.getFunction(_func);
  vm.frame.setCondition(func(operand, vm.env));
});

export class Assert extends UpdatingOpcode {
  public type = "assert";

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

    let expected;

    try {
      expected = JSON.stringify(cache.peek());
    } catch(e) {
      expected = String(cache.peek());
    }

    return {
      guid: _guid,
      type,
      args: [],
      details: { expected }
    };
  }
}

export class JumpIfNotModifiedOpcode extends UpdatingOpcode {
  public type = "jump-if-not-modified";

  private lastRevision: Revision;

  constructor(tag: RevisionTag, private target: LabelOpcode) {
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
      guid: this._guid,
      type: this.type,
      args: [JSON.stringify(this.target.inspect())]
    };
  }
}

export class DidModifyOpcode extends UpdatingOpcode {
  public type = "did-modify";

  constructor(private target: JumpIfNotModifiedOpcode) {
    super();
    this.tag = CONSTANT_TAG;
  }

  evaluate() {
    this.target.didModify();
  }
}

export class LabelOpcode implements UpdatingOpcode {
  public tag = CONSTANT_TAG;
  public type = "label";
  public label: Option<string> = null;
  public _guid: number;

  prev: any = null;
  next: any = null;

  constructor(label: string) {
    initializeGuid(this);
    if (label) this.label = label;
  }

  evaluate() {}

  inspect(): string {
    return `${this.label} [${this._guid}]`;
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [JSON.stringify(this.inspect())]
    };
  }
}
