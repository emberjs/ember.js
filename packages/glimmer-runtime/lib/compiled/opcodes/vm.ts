import { Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { CompiledExpression } from '../expressions';
import { CompiledArgs } from '../expressions/args';
import { VM, UpdatingVM } from '../../vm';
import { InlineBlock, Layout } from '../../scanner';
import { CompiledBlock } from '../../compiled/blocks';
import { NULL_REFERENCE } from '../../references';
import { Reference, ConstReference } from 'glimmer-reference';
import { Dict, Option, ListSlice, Opaque, Slice, expect } from 'glimmer-util';
import { CONSTANT_TAG, ReferenceCache, Revision, RevisionTag, isConst, isModified } from 'glimmer-reference';
import Environment from '../../environment';
import { SymbolTable } from 'glimmer-interfaces';

export class PushChildScopeOpcode extends Opcode {
  public type = "push-child-scope";

  evaluate(vm: VM) {
    vm.pushChildScope();
  }
}

export class PopScopeOpcode extends Opcode {
  public type = "pop-scope";

  evaluate(vm: VM) {
    vm.popScope();
  }
}

export class PushDynamicScopeOpcode extends Opcode {
  public type = "push-dynamic-scope";

  evaluate(vm: VM) {
    vm.pushDynamicScope();
  }
}

export class PopDynamicScopeOpcode extends Opcode {
  public type = "pop-dynamic-scope";

  evaluate(vm: VM) {
    vm.popDynamicScope();
  }
}

export class PutNullOpcode extends Opcode {
  public type = "put-null";

  evaluate(vm: VM) {
    vm.frame.setOperand(NULL_REFERENCE);
  }
}

export class PutValueOpcode extends Opcode {
  public type = "put-value";

  constructor(private expression: CompiledExpression<any>) {
    super();
  }

  evaluate(vm: VM) {
    vm.evaluateOperand(this.expression);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [this.expression.toJSON()]
    };
  }
}

export class PutArgsOpcode extends Opcode {
  public type = "put-args";

  constructor(private args: CompiledArgs) {
    super();
  }

  evaluate(vm: VM) {
    vm.evaluateArgs(this.args);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      details: {
        "positional": this.args.positional.toJSON(),
        "named": this.args.named.toJSON()
      }
    };
  }
}

export class BindPositionalArgsOpcode extends Opcode {
  public type = "bind-positional-args";

  static create(locals: Dict<number>): BindPositionalArgsOpcode {
    let names = Object.keys(locals);
    let symbols = names.map(name => locals[name]);
    return new this(names, symbols);
  }

  constructor(
    private names: ReadonlyArray<string>,
    private symbols: number[]
  ) {
    super();
  }

  evaluate(vm: VM) {
    vm.bindPositionalArgs(this.symbols);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [`[${this.names.map(name => JSON.stringify(name)).join(", ")}]`]
    };
  }
}

export class BindNamedArgsOpcode extends Opcode {
  public type = "bind-named-args";

  static create(layout: Layout) {
    let names = layout.named;
    let symbols = names.map(name => layout.symbolTable.getSymbol('named', name)) as number[];

    return new this(names, symbols);
  }

  constructor(
    private names: string[],
    private symbols: number[]
  ) {
    super();
  }

  evaluate(vm: VM) {
    vm.bindNamedArgs(this.names, this.symbols);
  }

  toJSON(): OpcodeJSON {
    let { names, symbols } = this;

    let args = names.map((name, i) => `$${symbols[i]}: $ARGS[${name}]`);

    return {
      guid: this._guid,
      type: this.type,
      args
    };
  }
}

export class BindBlocksOpcode extends Opcode {
  public type = "bind-blocks";

  static create(layout: Layout) {
    let names = layout.yields;
    let symbols = names.map(name => layout.symbolTable.getSymbol('yields', name)) as number[];

    return new this(names, symbols);
  }

  constructor(
    private names: string[],
    private symbols: number[]
  ) {
    super();
  }

  evaluate(vm: VM) {
    vm.bindBlocks(this.names, this.symbols);
  }

  toJSON(): OpcodeJSON {
    let { names, symbols } = this;

    let args = names.map((name, i) => `$${symbols[i]}: $BLOCKS[${name}]`);

    return {
      guid: this._guid,
      type: this.type,
      args
    };
  }
}

export class BindPartialArgsOpcode extends Opcode {
  public type = "bind-partial-args";

  static create(layout: Layout) {
    return new this(layout.symbolTable.getPartialArgs() as number);
  }

  constructor(private symbol: number) {
    super();
  }

  evaluate(vm: VM) {
    vm.bindPartialArgs(this.symbol);
  }
}

export class BindCallerScopeOpcode extends Opcode {
  public type = "bind-caller-scope";

  evaluate(vm: VM) {
    vm.bindCallerScope();
  }
}

export class BindDynamicScopeOpcode extends Opcode {
  public type = "bind-dynamic-scope";

  constructor(private names: ReadonlyArray<string>) {
    super();
  }

  evaluate(vm: VM) {
    vm.bindDynamicScope(this.names);
  }
}

export class EnterOpcode extends Opcode {
  public type = "enter";
  public slice: Slice<Opcode>; // Public because it's used by lazy content deopt

  constructor(begin: LabelOpcode, end: LabelOpcode) {
    super();
    this.slice = new ListSlice(begin, end);
  }

  evaluate(vm: VM) {
    vm.enter(this.slice);
  }

  toJSON(): OpcodeJSON {
    let { slice, type, _guid } = this;

    let begin = slice.head() as LabelOpcode;
    let end = slice.tail() as LabelOpcode;

    return {
      guid: _guid,
      type,
      args: [
        JSON.stringify(begin.inspect()),
        JSON.stringify(end.inspect())
      ]
    };
  }
}

export class ExitOpcode extends Opcode {
  public type = "exit";

  evaluate(vm: VM) {
    vm.exit();
  }
}

export interface LabelOptions {
  label?: string;
}

export class LabelOpcode extends Opcode implements UpdatingOpcode {
  public tag = CONSTANT_TAG;
  public type = "label";
  public label: Option<string> = null;

  prev: any = null;
  next: any = null;

  constructor(label: string) {
    super();
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

export interface EvaluateOptions {
  debug: string;
  block: InlineBlock;
}

export class EvaluateOpcode extends Opcode {
  public type = "evaluate";

  constructor(
    public debug: string,
    public block: InlineBlock
  ) {
    super();
  }

  evaluate(vm: VM) {
    let args = vm.frame.getArgs();
    vm.invokeBlock(this.block, args);
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, debug, block } = this;

    let compiled: Option<CompiledBlock> = block['compiled'];
    let children: OpcodeJSON[];

    if (compiled) {
      children = compiled.ops.toArray().map(op => op.toJSON());
    } else {
      children = [{ guid: null, type: '[ UNCOMPILED BLOCK ]' }];
    }

    return {
      guid,
      type,
      args: [debug],
      children
    };
  }
}

export type TestFunction = (ref: Reference<Opaque>, env: Environment) => Reference<boolean>;

export const ConstTest: TestFunction = function(ref: Reference<Opaque>, env: Environment): Reference<boolean> {
  return new ConstReference(!!ref.value());
};

export const SimpleTest: TestFunction = function(ref: Reference<Opaque>, env: Environment): Reference<boolean> {
  return ref as Reference<boolean>;
};

export const EnvironmentTest: TestFunction = function(ref: Reference<Opaque>, env: Environment): Reference<boolean> {
  return env.toConditionalReference(ref);
};

export class TestOpcode extends Opcode {
  public type = "test";

  constructor(private testFunc: TestFunction) {
    super();
  }

  evaluate(vm: VM) {
    vm.frame.setCondition(this.testFunc(vm.frame.getOperand(), vm.env));
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$OPERAND", this.testFunc.name]
    };
  }
}

export interface JumpOptions {
  target: LabelOpcode;
}

export class JumpOpcode extends Opcode {
  public type = "jump";

  constructor(private target: LabelOpcode) {
    super();
  }

  evaluate(vm: VM) {
    vm.goto(this.target);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [JSON.stringify(this.target.inspect())]
    };
  }
}

export class JumpIfOpcode extends JumpOpcode {
  public type = "jump-if";

  evaluate(vm: VM) {
    let reference = vm.frame.getCondition();

    if (isConst(reference)) {
      if (reference.value()) {
        super.evaluate(vm);
      }
    } else {
      let cache = new ReferenceCache(reference);

      if (cache.peek()) {
        super.evaluate(vm);
      }

      vm.updateWith(new Assert(cache));
    }
  }
}

export class JumpUnlessOpcode extends JumpOpcode {
  public type = "jump-unless";

  evaluate(vm: VM) {
    let reference = vm.frame.getCondition();

    if (isConst(reference)) {
      if (!reference.value()) {
        super.evaluate(vm);
      }
    } else {
      let cache = new ReferenceCache(reference);

      if (!cache.peek()) {
        super.evaluate(vm);
      }

      vm.updateWith(new Assert(cache));
    }
  }
}

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
