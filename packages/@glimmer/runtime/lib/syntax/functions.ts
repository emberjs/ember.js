import { BlockSymbolTable, ProgramSymbolTable } from '../symbol-table';
import { CompiledDynamicBlock, CompiledDynamicProgram } from '../compiled/blocks';
import { Ops } from '../../../wire-format';
import * as WireFormat from '@glimmer/wire-format';
import OpcodeBuilder from '../compiled/opcodes/builder';
import CompiledHasBlock, { CompiledHasBlockParams } from '../compiled/expressions/has-block';
import { DynamicInvoker } from '../compiled/opcodes/vm';
import { Op } from '../opcodes';
import { VM } from '../vm';
import { ClientSide, Block } from '../scanner';
import {
  CompiledInPartialGetBlock
} from '../compiled/expressions/has-block';

import {
  EMPTY_ARRAY,
  EMPTY_DICT
} from '../utils';

import {
  LOGGER,
  Opaque,
  Option,
  Dict,
  dict,
  assert,
  unwrap,
  unreachable
} from '@glimmer/util';

import {
  VersionedPathReference
} from '@glimmer/reference';

export type SexpExpression = WireFormat.Expression;
export type Syntax = WireFormat.Statement | WireFormat.Expression;
export type CompilerFunction<T extends Syntax> = ((sexp: T, builder: OpcodeBuilder) => void);
export type debugGet = ((path: string) => any);

export interface DebugContext {
  context: Opaque;
  get: debugGet;
}

export type debugCallback = ((context: Opaque, get: debugGet) => DebugContext);

function debugCallback(context: Opaque, get: debugGet) {
  console.info('Use `context`, and `get(<path>)` to debug this template.');
  /* tslint:disable */
  debugger;
  /* tslint:enable */
  return { context, get };
}

let callback = debugCallback;

// For testing purposes
export function setDebuggerCallback(cb: debugCallback) {
  callback = cb;
}

export function resetDebuggerCallback() {
  callback = debugCallback;
}

export class Compilers<T extends Syntax> {
  private names = dict<number>();
  private funcs: CompilerFunction<T>[] = [];

  constructor(private offset = 0) {}

  add(name: number, func: CompilerFunction<T>): void {
    this.funcs.push(func);
    this.names[name] = this.funcs.length - 1;
  }

  compile(sexp: T, builder: OpcodeBuilder): void {
    let name: number = sexp[this.offset];
    let index = this.names[name];
    let func = this.funcs[index];
    assert(!!func, `expected an implementation for ${sexp[0]}`);
    func(sexp, builder);
  }
}

import S = WireFormat.Statements;

export const STATEMENTS = new Compilers<WireFormat.Statement>();
export const CLIENT_SIDE = new Compilers<ClientSide.ClientSideStatement>(1);

STATEMENTS.add(Ops.Text, (sexp: S.Text, builder: OpcodeBuilder) => {
  builder.text(sexp[1]);
});

STATEMENTS.add(Ops.Comment, (sexp: S.Comment, builder: OpcodeBuilder) => {
  builder.comment(sexp[1]);
});

STATEMENTS.add(Ops.CloseElement, (_sexp, builder: OpcodeBuilder) => {
  LOGGER.trace('close-element statement');
  builder.closeElement();
});

STATEMENTS.add(Ops.FlushElement, (_sexp, builder: OpcodeBuilder) => {
  builder.flushElement();
});

STATEMENTS.add(Ops.Modifier, (_sexp: S.Modifier, _builder: OpcodeBuilder) => {
  let { env, symbolTable } = _builder;
  let [, name, params, hash] = _sexp;

  compileArgs(params, hash, _builder); // side-effecty seems weird

  if (env.hasModifier(name, symbolTable)) {
    _builder.pushReifiedArgs(params ? params.length : 0, hash ? hash[0] : EMPTY_ARRAY);
    _builder.modifier(env.lookupModifier(name, symbolTable));
  } else {
    throw new Error(`Compile Error ${name} is not a modifier: Helpers may not be used in the element form.`);
  }
});

STATEMENTS.add(Ops.StaticAttr, (sexp: S.StaticAttr, builder: OpcodeBuilder) => {
  let [, name, value, namespace] = sexp;
  builder.staticAttr(name, namespace, value as string);
});

CLIENT_SIDE.add(ClientSide.Ops.AnyDynamicAttr, (sexp: ClientSide.AnyDynamicAttr, builder: OpcodeBuilder) => {
  let [,, name, value, namespace, trusting] = sexp;

  expr(value, builder);

  if (namespace) {
    builder.dynamicAttrNS(name, namespace, trusting);
  } else {
    builder.dynamicAttr(name, trusting);
  }
});

STATEMENTS.add(Ops.OpenElement, (sexp: S.OpenElement, builder: OpcodeBuilder) => {
  builder.openPrimitiveElement(sexp[1]);
});

CLIENT_SIDE.add(ClientSide.Ops.OpenDynamicElement, (sexp: ClientSide.OpenDynamicElement, builder) => {
  builder.pushComponentOperations();
  expr(sexp[2], builder);
  builder.openDynamicElement();
});

CLIENT_SIDE.add(ClientSide.Ops.OpenComponentElement, (sexp: ClientSide.OpenComponentElement, builder) => {
  builder.pushComponentOperations();
  builder.openElementWithOperations(sexp[2]);
});

CLIENT_SIDE.add(ClientSide.Ops.OptimizedAppend, (sexp: ClientSide.OptimizedAppend, builder: OpcodeBuilder) => {
  let [,, value, trustingMorph] = sexp;

  let { inlines } = builder.env.macros();
  let returned = inlines.compile(sexp, builder) || value;

  if (returned === true) return;

  expr(value, builder);

  if (trustingMorph) {
    builder.trustingAppend();
  } else {
    builder.cautiousAppend();
  }
});

CLIENT_SIDE.add(ClientSide.Ops.UnoptimizedAppend, (sexp: ClientSide.UnoptimizedAppend, builder) => {
  let [,, value, trustingMorph] = sexp;

  let { inlines } = builder.env.macros();
  let returned = inlines.compile(sexp, builder) || value;

  if (returned === true) return;

  if (trustingMorph) {
    builder.guardedTrustingAppend(returned[1]);
  } else {
    builder.guardedCautiousAppend(returned[1]);
  }
});

CLIENT_SIDE.add(ClientSide.Ops.NestedBlock, (sexp: ClientSide.NestedBlock, builder: OpcodeBuilder) => {
  let { blocks } = builder.env.macros();
  blocks.compile(sexp, builder);
});

CLIENT_SIDE.add(ClientSide.Ops.ScannedBlock, (sexp: ClientSide.ScannedBlock, builder) => {
  let [,, name, params, hash, template, inverse] = sexp;

  let templateBlock = template && template.scan();
  let inverseBlock = inverse && inverse.scan();

  let { blocks } = builder.env.macros();
  blocks.compile([Ops.ClientSideStatement, ClientSide.Ops.NestedBlock, name, params, hash, templateBlock, inverseBlock], builder);
});

export class InvokeDynamicLayout implements DynamicInvoker<ProgramSymbolTable> {
  constructor(private attrs: Option<Block>, private names: string[]) {}

  invoke(vm: VM, layout: Option<CompiledDynamicProgram>) {
    let table = layout!.symbolTable as ProgramSymbolTable;
    let stack = vm.evalStack;
    let { names: callerNames } = this;

    let scope = vm.pushRootScope(table.size, true);
    scope.bindSelf(stack.pop<VersionedPathReference<Opaque>>());

    scope.bindBlock(table.getSymbol('yields', '%attrs%')!, this.attrs);

    let calleeNames = table.getSymbols().named!;

    for (let i=callerNames.length - 1; i>=0; i--) {
      let symbol = calleeNames && calleeNames[callerNames[i]];
      let value = stack.pop<VersionedPathReference<Opaque>>();

      if (symbol) scope.bindSymbol(symbol, value);
    }

    let inverseSymbol = table.getSymbol('yields', 'inverse');
    let inverse = stack.pop<Option<Block>>();

    if (inverseSymbol !== null) {
      scope.bindBlock(inverseSymbol, inverse);
    }

    scope.bindBlock(table.getSymbol('yields', 'default')!, stack.pop<Option<Block>>());

    vm.invoke(layout!);
  }

  toJSON() {
    return { GlimmerDebug: '<invoke-dynamic-layout>' };
  }
}

export function compileComponentArgs(args: Option<C.Hash>, builder: OpcodeBuilder) {
  let count: number, slots: Dict<number>, names: string[];

  if (args) {
    names = args[0];
    count = compileList(args[1], builder);
    slots = dict<number>();
    names.forEach((name, i) => slots[name] = count - i - 1);
  } else {
    slots = EMPTY_DICT;
    count = 0;
    names = [];
  }

  return { slots, count, names };
}

CLIENT_SIDE.add(ClientSide.Ops.ResolvedComponent, (sexp: ClientSide.ResolvedComponent, builder) => {
  let [,, definition, attrs, [, hash], block, inverse] = sexp;

  let state = builder.local();

  builder.pushComponentManager(definition);
  builder.setComponentState(state);

  builder.pushBlock(block);
  builder.pushBlock(inverse);
  let { slots, count, names } = compileComponentArgs(hash, builder);

  builder.pushDynamicScope();
  builder.pushComponentArgs(0, count, slots);
  builder.createComponent(state, true, false);
  builder.registerComponentDestructor(state);
  builder.beginComponentTransaction();

  builder.getComponentSelf(state);
  builder.getComponentLayout(state);
  builder.invokeDynamic(new InvokeDynamicLayout(attrs && attrs.scan(), names));
  builder.didCreateElement(state);

  builder.didRenderLayout(state);
  builder.popScope();
  builder.popDynamicScope();
  builder.commitComponentTransaction();
});

CLIENT_SIDE.add(ClientSide.Ops.ScannedComponent, (sexp: ClientSide.ScannedComponent, builder) => {
  let [,, tag, attrs, rawArgs, rawBlock] = sexp;
  let block = rawBlock && rawBlock.scan();

  // `local` is a temporary we store component state throughout this algorithm

  // (PushComponentManager #definition)           ; stack: [..., definition, mgr]
  // (SetComponentState local:u32)                ; stack: [...]
  // ... args                                     ; stack: [..., ...args]
  // (PushBlock #block)                           ; stack: [..., ...args, block]
  // (PushDynamicScope)                           ; stack: [..., ...args, block] NOTE: Early because of mgr.create() 🤔
  // (PushComponentArgs N N #Dict<number>)        ; stack: [..., ...args, block, userArgs]
  // (CreateComponent 0b01 local:u32)             ; stack: [..., ...args, block, component]
  // (RegisterComponentDestructor local:u32)
  // (BeginComponentTransaction)
  // (PushComponentOperations)                    ; stack: [..., ...args, block, operations]
  // (OpenElementWithOperations tag:#string)      ; stack: [..., ...args, block]
  // (DidCreateElement local:u32)
  // (InvokeStatic #attrs)                        ; NOTE: Still original scope
  // (GetComponentSelf)                           ; stack: [..., ...args, block, VersionedPathReference]
  // (BindSelf)                                   ; stack: [..., ...args, block]
  // (GetLocal local:u32)                         ; stack: [..., Layout]
  // (GetComponentLayout state:u32, layout: u32)  ; stack: [..., ...args, block, VersionedPathReference, Layout]
  // (InvokeDynamic invoker:#LayoutInvoker)       ; stack: [...]
  // (DidRenderLayout local:u32)                  ; stack: [...]
  // (PopScope)
  // (PopDynamicScope)
  // (CommitComponentTransaction)

  let definition = builder.env.getComponentDefinition(tag, builder.symbolTable);

  let state = builder.local();

  builder.pushComponentManager(definition);
  builder.setComponentState(state);

  builder.pushBlock(block);
  builder.pushBlock(null);

  let { slots, count, names } = compileComponentArgs(rawArgs, builder);

  builder.pushDynamicScope();
  builder.pushComponentArgs(0, count, slots);
  builder.createComponent(state, true, false);
  builder.registerComponentDestructor(state);
  builder.beginComponentTransaction();

  builder.getComponentSelf(state);
  builder.getComponentLayout(state);
  builder.invokeDynamic(new InvokeDynamicLayout(attrs.scan(), names));
  builder.didCreateElement(state);

  builder.didRenderLayout(state);
  builder.popScope();
  builder.popDynamicScope();
  builder.commitComponentTransaction();
});

CLIENT_SIDE.add(ClientSide.Ops.StaticPartial, (sexp: ClientSide.StaticPartial, builder) => {
  let [,, name] = sexp;

  if (!builder.env.hasPartial(name, builder.symbolTable)) {
    throw new Error(`Compile Error: Could not find a partial named "${name}"`);
  }

  let definition = builder.env.lookupPartial(name, builder.symbolTable);

  builder.putPartialDefinition(definition);
  builder.evaluatePartial();
});

CLIENT_SIDE.add(ClientSide.Ops.DynamicPartial, (_sexp: ClientSide.DynamicPartial, _builder) => {
  // let [, name] = sexp;

  //   builder.startLabels();

  //   builder.putValue(name);
  //   builder.test('simple');
  //   builder.enter('BEGIN', 'END');
  //   builder.label('BEGIN');
  //   builder.jumpUnless('END');
  //   builder.putDynamicPartialDefinition();
  //   builder.evaluatePartial();
  //   builder.label('END');
  //   builder.exit();

  //   builder.stopLabels();
});

class InvokeDynamicYield implements DynamicInvoker<BlockSymbolTable> {
  constructor(private callerCount: number) {}

  invoke(vm: VM, block: Option<CompiledDynamicBlock>) {
    let { callerCount } = this;
    let stack = vm.evalStack;

    vm.pushCallerScope();

    if (!block) {
      for (let i=callerCount-1; i>=0; i--) {
        stack.pop();
      }

      return;
    }

    let table = block.symbolTable;
    let locals = table.getSymbols().locals; // always present in inline blocks

    let calleeCount = locals ? locals.length : 0;
    let excess = Math.min(callerCount - calleeCount, 0);

    for (let i=0; i<excess; i++) {
      stack.pop();
    }

    let count = Math.min(callerCount, calleeCount);

    let scope = vm.scope();

    for (let i=count-1; i>=0; i--) {
      scope.bindSymbol(locals![i], stack.pop<VersionedPathReference<Opaque>>());
    }

    vm.invoke(block);
  }

  toJSON() {
    return { GlimmerDebug: `<invoke-dynamic-yield caller-count=${this.callerCount}>` };
  }
}

STATEMENTS.add(Ops.Yield, (sexp: WireFormat.Statements.Yield, builder) => {
  let [, to, params] = sexp;

  if (params) compileList(params, builder);

  let table = builder.symbolTable;
  let yields: Option<number>, partial: Option<number>;

  let count = compileList(params, builder);

  if (yields = table.getSymbol('yields', to)) {
    builder.push(Op.GetBlock, yields);
  } else if (partial = table.getPartialArgs()) {
    builder.push(Op.GetEvalBlock, partial, builder.string(to));
  } else {
    throw new Error(`[BUG] ${to} is not a valid block name.`);
  }

  builder.compileDynamicBlock();
  builder.invokeDynamic(new InvokeDynamicYield(count));
  builder.popScope();
});

STATEMENTS.add(Ops.Debugger, (_sexp: WireFormat.Statements.Debugger, _builder: OpcodeBuilder) => {

  // builder.putValue([Ops.Function, (vm: VM) => {
  //   let context = vm.getSelf().value();
  //   let get = (path: string) => {
  //     return getter(vm, builder)(path).value();
  //   };
  //   callback(context, get);
  // }]);

  // return sexp;
});

STATEMENTS.add(Ops.ClientSideStatement, (sexp: WireFormat.Statements.ClientSide, builder) => {
  CLIENT_SIDE.compile(sexp as ClientSide.ClientSideStatement, builder);
});

const EXPRESSIONS = new Compilers<WireFormat.Expression>();
const CLIENT_SIDE_EXPRS = new Compilers<ClientSide.ClientSideExpression>(1);

import E = WireFormat.Expressions;
import C = WireFormat.Core;

export function expr(expression: WireFormat.Expression, builder: OpcodeBuilder): void {
  if (Array.isArray(expression)) {
    EXPRESSIONS.compile(expression, builder);
  } else {
    builder.primitive(expression);
  }
}

EXPRESSIONS.add(Ops.Unknown, (sexp: E.Unknown, builder: OpcodeBuilder) => {
  let name = sexp[1];

  if (builder.env.hasHelper(name, builder.symbolTable)) {
    EXPRESSIONS.compile([Ops.Helper, name, EMPTY_ARRAY, null], builder);
  } else {
    compilePath(path, builder);
  }
});

EXPRESSIONS.add(Ops.Concat, ((sexp: E.Concat, builder: OpcodeBuilder) => {
  let parts = sexp[1];
  parts.forEach(p => expr(p, builder));
  builder.concat(parts.length);
}) as any);

CLIENT_SIDE_EXPRS.add(ClientSide.Ops.FunctionExpression, (sexp: ClientSide.FunctionExpression, builder: OpcodeBuilder) => {
  builder.function(sexp[2]);
});

EXPRESSIONS.add(Ops.Helper, (sexp: E.Helper, builder: OpcodeBuilder) => {
  let { env, symbolTable } = builder;
  let [, name, params, hash] = sexp;

  if (env.hasHelper(name, symbolTable)) {
    compileArgs(params, hash, builder);
    builder.pushReifiedArgs(params ? params.length : 0, hash ? hash[0] : EMPTY_ARRAY);
    builder.helper(env.lookupHelper(name, symbolTable));
  } else {
    throw new Error(`Compile Error: ${name} is not a helper`);
  }
});

CLIENT_SIDE_EXPRS.add(ClientSide.Ops.ResolvedHelper, (sexp: ClientSide.ResolvedHelper, builder) => {
  let [,, helper, params, hash] = sexp;

  compileArgs(params, hash, builder);
  builder.pushReifiedArgs(params ? params.length : 0, hash ? hash[0] : EMPTY_ARRAY);
  builder.helper(helper);
});

EXPRESSIONS.add(Ops.Get, (sexp: E.Get, builder: OpcodeBuilder) => {
  // TODO: More triage in the precompiler
  compilePath(sexp[1], builder);
});

EXPRESSIONS.add(Ops.Undefined, (_sexp, builder) => {
  return builder.primitive(undefined);
});

EXPRESSIONS.add(Ops.Arg, (sexp: E.Arg, builder: OpcodeBuilder) => {
  let [, parts] = sexp;
  let head = parts[0];
  let named: Option<number>, partial: Option<number>;
  let path: string[];

  if (named = builder.symbolTable.getSymbol('named', head)) {
    builder.getVariable(named);
    path = parts.slice(1);
  } else if (partial = builder.symbolTable.getPartialArgs()) {
    throw new Error("TODO: Partial");
  } else {
    throw new Error(`[BUG] @${parts.join('.')} is not a valid lookup path.`);
  }

  path.forEach(p => builder.getProperty(p));
});

EXPRESSIONS.add(Ops.HasBlock, (sexp: E.HasBlock, builder) => {
  let blockName = sexp[1];

  let yields: Option<number>, partial: Option<number>;

  if (yields = builder.symbolTable.getSymbol('yields', blockName)) {
    builder.hasBlock(blockName);
  } else if (partial = builder.symbolTable.getPartialArgs()) {
    let inner = new CompiledInPartialGetBlock(partial, blockName);
    return new CompiledHasBlock(inner);
  } else {
    throw new Error('[BUG] ${blockName} is not a valid block name.');
  }
});

EXPRESSIONS.add(Ops.HasBlockParams, (sexp: E.HasBlockParams, builder) => {
  let blockName = sexp[1];
  let yields: Option<number>, partial: Option<number>;

  if (yields = builder.symbolTable.getSymbol('yields', blockName)) {
    builder.hasBlockParams(blockName);
  } else if (partial = builder.symbolTable.getPartialArgs()) {
    let inner = new CompiledInPartialGetBlock(partial, blockName);
    return new CompiledHasBlockParams(inner);
  } else {
    throw new Error('[BUG] ${blockName} is not a valid block name.');
  }
});

EXPRESSIONS.add(Ops.ClientSideExpression, (sexp: E.ClientSide, builder) => {
  CLIENT_SIDE_EXPRS.compile(sexp as ClientSide.ClientSideExpression, builder);
});

export function compileArgs(params: Option<WireFormat.Core.Params>, hash: Option<WireFormat.Core.Hash>, builder: OpcodeBuilder): { positional: number, named: number } {
  let positional = params ? params.length : 0;
  let named = hash ? hash.length : 0;
  if (params) compileList(params, builder);
  if (hash) compileList(hash[1], builder);

  return { positional, named };
}

export function compileList(params: Option<WireFormat.Expression[]>, builder: OpcodeBuilder): number {
  if (!params) return 0;
  params.forEach(p => expr(p, builder));
  return params.length;
}

const EMPTY_BLOCKS = { default: false, inverse: false };

export function compileBlocks(block: Option<Block>, inverse: Option<Block>, builder: OpcodeBuilder): { default: boolean, inverse: boolean } {
  if (!block && !inverse) return EMPTY_BLOCKS;
  builder.pushBlocks(block, inverse);
  return { default: !!block, inverse: !!inverse };
}

function compilePath(parts: string[], builder: OpcodeBuilder) {
  let head = parts[0];
  let local: Option<number>;
  let path: string[];

  if (head === null) { // {{this.foo}}
    builder.self();
    path = parts.slice(1);
  } else if (local = builder.symbolTable.getSymbol('local', head)) {
    builder.getVariable(local);
    path = parts.slice(1);
  } else {
    builder.self();
    path = parts;
  }

  path.forEach(p => builder.getProperty(p));
}

export type NestedBlockSyntax = ClientSide.NestedBlock;
export type CompileBlockMacro = (sexp: NestedBlockSyntax, builder: OpcodeBuilder) => void;

export class Blocks {
  private names = dict<number>();
  private funcs: CompileBlockMacro[] = [];
  private missing: CompileBlockMacro;

  add(name: string, func: CompileBlockMacro) {
    this.funcs.push(func);
    this.names[name] = this.funcs.length - 1;
  }

  addMissing(func: CompileBlockMacro) {
    this.missing = func;
  }

  compile(sexp: ClientSide.NestedBlock, builder: OpcodeBuilder): void {
    let name: string = sexp[2];
    let index = this.names[name];

    if (index === undefined) {
      assert(!!this.missing, `${name} not found, and no catch-all block handler was registered`);
      let func = this.missing;
      let handled = func(sexp, builder);
      assert(!!handled, `${name} not found, and the catch-all block handler didn't handle it`);
    } else {
      let func = this.funcs[index];
      func(sexp, builder);
    }
  }
}

export const BLOCKS = new Blocks();

export type AppendSyntax = ClientSide.OptimizedAppend | ClientSide.UnoptimizedAppend;
export type AppendMacro = (name: string, params: Option<C.Params>, hash: Option<C.Hash>, builder: OpcodeBuilder) => ['expr', WireFormat.Expression] | true | false;

export class Inlines {
  private names = dict<number>();
  private funcs: AppendMacro[] = [];
  private missing: AppendMacro;

  add(name: string, func: AppendMacro) {
    this.funcs.push(func);
    this.names[name] = this.funcs.length - 1;
  }

  addMissing(func: AppendMacro) {
    this.missing = func;
  }

  compile(sexp: AppendSyntax, builder: OpcodeBuilder): ['expr', WireFormat.Expression] | true {
    let value = sexp[2];

    // TODO: Fix this so that expression macros can return
    // things like components, so that {{component foo}}
    // is the same as {{(component foo)}}

    if (!Array.isArray(value)) return ['expr', value];

    let name: string;
    let params: Option<C.Params>;
    let hash: Option<C.Hash>;

    if (value[0] === Ops.Helper) {
      name = value[1];
      params = value[2];
      hash = value[3];
    } else if (value[0] === Ops.Unknown) {
      name = value[1];
      params = hash = null;
    } else {
      return ['expr', value];
    }

    let index = this.names[name];

    if (index === undefined && this.missing) {
      let func = this.missing;
      let returned = func(name, params, hash, builder);
      return returned === false ? ['expr', value] : returned;
    } else if (index !== undefined) {
      let func = this.funcs[index];
      let returned = func(name, params, hash, builder);
      return returned === false ? ['expr', value] : returned;
    } else {
      return ['expr', value];
    }
  }
}

export const INLINES = new Inlines();

populateBuiltins(BLOCKS, INLINES);

export function populateBuiltins(blocks: Blocks = new Blocks(), inlines: Inlines = new Inlines()): { blocks: Blocks, inlines: Inlines } {
  blocks.add('if', (sexp: ClientSide.NestedBlock, builder: OpcodeBuilder) => {
    //        PutArgs
    //        Test(Environment)
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        JumpUnless(ELSE)
    //        Evaluate(default)
    //        Jump(END)
    // ELSE:  Noop
    //        Evalulate(inverse)
    // END:   Noop
    //        Exit

    let [,,, params,, _default, inverse] = sexp;

    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #if requires a single argument`);
    }

    let condition = builder.local();
    expr(params[0], builder);
    builder.setLocal(condition);

    builder.getLocal(condition);
    builder.test('environment');

    builder.labelled(b => {
      if (_default && inverse) {
        b.jumpUnless('ELSE');
        b.invokeStatic(_default);
        b.jump('END');
        b.label('ELSE');
        b.invokeStatic(inverse);
      } else if (_default) {
        b.jumpUnless('END');
        b.invokeStatic(_default);
      } else {
        throw unreachable();
      }
    });
  });

  blocks.add('unless', (sexp: ClientSide.NestedBlock, builder: OpcodeBuilder) => {
    //        PutArgs
    //        Test(Environment)
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        JumpUnless(ELSE)
    //        Evaluate(default)
    //        Jump(END)
    // ELSE:  Noop
    //        Evalulate(inverse)
    // END:   Noop
    //        Exit

    let [,,, params,, _default, inverse] = sexp;

    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #unless requires a single argument`);
    }

    let condition = builder.local();
    expr(params[0], builder);
    builder.setLocal(condition);

    builder.getLocal(condition);
    builder.test('environment');

    builder.labelled(b => {
      if (_default && inverse) {
        b.jumpIf('ELSE');
        b.invokeStatic(_default);
        b.jump('END');
        b.label('ELSE');
        b.invokeStatic(inverse);
      } else if (_default) {
        b.jumpIf('END');
        b.invokeStatic(_default);
      } else {
        throw unreachable();
      }
    });
  });

  blocks.add('with', (sexp: ClientSide.NestedBlock, builder: OpcodeBuilder) => {
    //        PutArgs
    //        Test(Environment)
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        JumpUnless(ELSE)
    //        Evaluate(default)
    //        Jump(END)
    // ELSE:  Noop
    //        Evalulate(inverse)
    // END:   Noop
    //        Exit

    let [,,, params,, _default, inverse] = sexp;

    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #with requires a single argument`);
    }

    let item = builder.local();
    expr(params[0], builder);
    builder.setLocal(item);

    builder.getLocal(item);
    builder.test('environment');

    builder.labelled(b => {
      if (_default && inverse) {
        b.jumpUnless('ELSE');
        b.invokeStatic(_default, b => {
          b.getLocal(item);
        });
        b.jump('END');
        b.label('ELSE');
        b.invokeStatic(inverse);
      } else if (_default) {
        b.jumpUnless('END');
        b.invokeStatic(_default, b => {
          b.getLocal(item);
        });
      } else {
        throw unreachable();
      }
    });
  });

  blocks.add('each', (sexp: ClientSide.NestedBlock, builder: OpcodeBuilder) => {
    //         Enter(BEGIN, END)
    // BEGIN:  Noop
    //         PutArgs
    //         PutIterable
    //         JumpUnless(ELSE)
    //         EnterList(BEGIN2, END2)
    // ITER:   Noop
    //         NextIter(BREAK)
    //         EnterWithKey(BEGIN2, END2)
    // BEGIN2: Noop
    //         PushChildScope
    //         Evaluate(default)
    //         PopScope
    // END2:   Noop
    //         Exit
    //         Jump(ITER)
    // BREAK:  Noop
    //         ExitList
    //         Jump(END)
    // ELSE:   Noop
    //         Evalulate(inverse)
    // END:    Noop
    //         Exit

    // TOMORROW: Locals for key, value, memo
    // TOMORROW: What is the memo slot used for?

    let [,,, params, hash, _default, inverse] = sexp;

    let list = builder.local();

    if (hash && hash[0][0] === 'key') {
      expr(hash[1][0], builder);
    } else {
      throw new Error('Compile error: #each without key');
    }

    expr(params[0], builder);
    builder.setLocal(list);
    builder.getLocal(list);

    builder.labelled(b => {
      b.putIterator();

      if (inverse) {
        b.jumpUnless('ELSE');
      } else {
        b.jumpUnless('END');
      }

      b.iter(b => {
        b.invokeStatic(unwrap(_default), 2);
      });

      if (inverse) {
        b.jump('END');
        b.label('ELSE');
        b.invokeStatic(inverse);
      }
    });

    // pop the iterator that is at the top of the stack
    // throughout this process.
    builder.pop();
  });

  return { blocks, inlines };
}
