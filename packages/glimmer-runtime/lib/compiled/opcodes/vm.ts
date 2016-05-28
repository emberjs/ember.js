import { AbstractOpcode, Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { CompiledExpression } from '../expressions';
import { CompiledArgs, EvaluatedArgs } from '../expressions/args';
import { VM, UpdatingVM, BindDynamicScopeCallback } from '../../vm';
import { Layout, InlineBlock, PartialBlock } from '../blocks';
import { turbocharge } from '../../utils';
import { NULL_REFERENCE } from '../../references';
import SymbolTable from '../../symbol-table';
import { PathReference } from 'glimmer-reference';
import { ValueReference } from '../expressions/value';
import { ListSlice, Opaque, Slice, Dict, dict, assign, InternedString } from 'glimmer-util';
import { CONSTANT_TAG, ReferenceCache, Revision, RevisionTag, isConst, isModified } from 'glimmer-reference';
import Scanner from '../../scanner';

export class PushChildScopeOpcode extends Opcode {
  public type = "push-child-scope";

  evaluate(vm: VM) {
    vm.pushChildScope();
  }
}

export class PushRootScopeOpcode extends Opcode {
  public type = "push-root-scope";
  public size: number;

  constructor({ size }: { size: number }) {
    super();
    this.size = size;
  }

  evaluate(vm: VM) {
    vm.pushRootScope(vm.frame.getOperand(), this.size);
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
  private expression: CompiledExpression<any>;

  constructor({ expression }: { expression: CompiledExpression<any> }) {
    super();
    this.expression = expression;
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

  private args: CompiledArgs;

  constructor({ args }: { args: CompiledArgs }) {
    super();
    this.args = args;
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

  private names: string[];
  private positional: number[];

  constructor({ block }: { block: InlineBlock }) {
    super();

    this.names = block.locals;
    let positional = this.positional = [];

    block.locals.forEach((name) => {
      positional.push(block.symbolTable.getLocal(name));
    });
  }

  evaluate(vm: VM) {
    vm.bindPositionalArgs(this.positional);
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

  public named: Dict<number>;

  static create(layout: Layout) {
    let named = layout['named'].reduce(
      (obj, name) => assign(obj, { [<string>name]: layout.symbolTable.getNamed(name) }),
      dict<number>()
    );

    turbocharge(named);
    return new BindNamedArgsOpcode({ named });
  }

  constructor({ named }: { named: Dict<number> }) {
    super();
    this.named = named;
  }

  evaluate(vm: VM) {
    vm.bindNamedArgs(this.named);
  }

  toJSON(): OpcodeJSON {
    let args = Object.keys(this.named).map(name => {
      return `$${this.named[name]}: $ARGS[${name}]`;
    });

    return {
      guid: this._guid,
      type: this.type,
      args
    };
  }
}

export class BindBlocksOpcode extends Opcode {
  public type = "bind-blocks";

  public blocks: Dict<number>;

  static create(template: Layout) {
    let blocks = dict<number>();
    template['yields'].forEach(name => {
      blocks[<string>name] = template.symbolTable.getYield(name);
    });

    return new BindBlocksOpcode({ blocks });
  }

  constructor({ blocks }: { blocks: Dict<number> }) {
    super();
    this.blocks = blocks;
  }

  evaluate(vm: VM) {
    vm.bindBlocks(this.blocks);
  }
}

export class BindDynamicScopeOpcode extends Opcode {
  public type = "bind-dynamic-scope";

  public callback: BindDynamicScopeCallback;

  constructor(callback: BindDynamicScopeCallback) {
    super();
    this.callback = callback;
  }

  evaluate(vm: VM) {
    vm.bindDynamicScope(this.callback);
  }
}

export class EnterOpcode extends Opcode {
  public type = "enter";
  private slice: Slice<Opcode>;

  constructor({ begin, end }: { begin: LabelOpcode, end: LabelOpcode }) {
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

export class LabelOpcode extends AbstractOpcode implements Opcode, UpdatingOpcode {
  public tag = CONSTANT_TAG;
  public type = "label";
  public label: string = null;

  prev: any = null;
  next: any = null;

  constructor({ label }: { label?: string }) {
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

export class EvaluateOpcode extends Opcode {
  public type = "evaluate";
  public debug: string;
  public block: InlineBlock;

  constructor({ debug, block }: { debug: string, block: InlineBlock }) {
    super();
    this.debug = debug;
    this.block = block;
  }

  evaluate(vm: VM) {
    vm.invokeBlock(this.block, vm.frame.getArgs());
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [this.debug]
    };
  }
}

export class EvaluatePartialOpcode extends Opcode {
  public type = "evaluate-partial";
  public symbolTable: SymbolTable;
  public name: CompiledExpression<any>;
  private cache = dict<PartialBlock>();

  constructor({ name, symbolTable }: { symbolTable: SymbolTable, name: CompiledExpression<any> }) {
    super();
    this.name = name;
    this.symbolTable = symbolTable;
  }

  evaluate(vm: VM) {
    let reference: PathReference<any> = this.name.evaluate(vm);
    let referenceCache = new ReferenceCache(reference);
    let name: InternedString = referenceCache.revalidate();

    let block = this.cache[name];
    if (!block) {
      let { template } = vm.env.lookupPartial([name]);
      let scanner = new Scanner(template, vm.env);
      block = scanner.scanPartial(this.symbolTable);
    }

    vm.invokeBlock(block, EvaluatedArgs.empty());

    if (!isConst(reference)) {
      vm.updateWith(new Assert(referenceCache));
    }
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [this.name.toJSON()]
    };
  }
}

export class NameToPartialOpcode extends Opcode {
  public type = "name-to-partial";

  evaluate(vm: VM) {
    let reference = vm.frame.getOperand();
    let referenceCache = new ReferenceCache(reference);
    let name: InternedString = referenceCache.revalidate();
    let partial = name && vm.env.hasPartial([name]) ? vm.env.lookupPartial([name]) : false;
    vm.frame.setOperand(new ValueReference(partial));

    if (!isConst(reference)) {
      vm.updateWith(new Assert(referenceCache));
    }
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$OPERAND"]
    };
  }
}

export class TestOpcode extends Opcode {
  public type = "test";

  evaluate(vm: VM) {
    vm.frame.setCondition(vm.env.toConditionalReference(vm.frame.getOperand()));
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$OPERAND"]
    };
  }
}

export class JumpOpcode extends Opcode {
  public type = "jump";

  private target: LabelOpcode;

  constructor({ target }: { target: LabelOpcode }) {
    super();
    this.target = target;
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

  private target: LabelOpcode;
  private lastRevision: Revision;

  constructor({ tag, target }: { tag: RevisionTag, target: LabelOpcode }) {
    super();
    this.tag = tag;
    this.target = target;
    this.lastRevision = tag.value();
  }

  evaluate(vm: UpdatingVM) {
    let { tag, target, lastRevision } = this;

    if (tag.validate(lastRevision)) {
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

  private target: JumpIfNotModifiedOpcode;

  constructor({ target }: { target: JumpIfNotModifiedOpcode }) {
    super();
    this.tag = CONSTANT_TAG;
    this.target = target;
  }

  evaluate() {
    this.target.didModify();
  }
}
