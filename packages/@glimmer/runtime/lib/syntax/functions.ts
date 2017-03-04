import { ScopeSlot } from '../environment';
import { CompiledDynamicBlock, CompiledDynamicProgram } from '../compiled/blocks';
import * as WireFormat from '@glimmer/wire-format';
import { BlockSymbolTable, ProgramSymbolTable } from '@glimmer/interfaces';
import OpcodeBuilder from '../compiled/opcodes/builder';
import { DynamicInvoker } from '../compiled/opcodes/vm';
import { VM, PublicVM } from '../vm';
import { IArguments } from '../vm/arguments';
import { ATTRS_BLOCK, Block, ClientSide } from '../scanner';
import { EMPTY_ARRAY } from '../utils';

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
  VersionedPathReference,
  map
} from '@glimmer/reference';

import Ops = WireFormat.Ops;

export type SexpExpression = WireFormat.Expression;
export type Syntax = WireFormat.Statement | WireFormat.Expression;
export type CompilerFunction<T extends Syntax> = ((sexp: T, builder: OpcodeBuilder) => void);

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

STATEMENTS.add(Ops.Modifier, (sexp: S.Modifier, builder: OpcodeBuilder) => {
  let { env, meta } = builder;
  let [, name, params, hash] = sexp;

  if (env.hasModifier(name, meta.templateMeta)) {
    builder.compileArgs(params, hash, true);
    builder.modifier(env.lookupModifier(name, meta.templateMeta));
  } else {
    throw new Error(`Compile Error ${name} is not a modifier: Helpers may not be used in the element form.`);
  }
});

STATEMENTS.add(Ops.StaticAttr, (sexp: S.StaticAttr, builder: OpcodeBuilder) => {
  let [, name, value, namespace] = sexp;
  builder.staticAttr(name, namespace, value as string);
});

STATEMENTS.add(Ops.DynamicAttr, (sexp: S.DynamicAttr, builder) => {
  dynamicAttr(sexp, false, builder);
});

STATEMENTS.add(Ops.TrustingAttr, (sexp: S.DynamicAttr, builder) => {
  dynamicAttr(sexp, true, builder);
});

function dynamicAttr(sexp: S.DynamicAttr | S.TrustingAttr, trusting: boolean, builder: OpcodeBuilder) {
  let [, name, value, namespace] = sexp;

  expr(value, builder);

  if (namespace) {
    builder.dynamicAttrNS(name, namespace, trusting);
  } else {
    builder.dynamicAttr(name, trusting);
  }
}

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

STATEMENTS.add(Ops.Append, (sexp: S.Append, builder: OpcodeBuilder) => {
  let [, value, trusting] = sexp;

  let { inlines } = builder.env.macros();
  let returned = inlines.compile(sexp, builder) || value;

  if (returned === true) return;

  expr(value, builder);

  if (trusting) {
    builder.trustingAppend();
  } else {
    builder.cautiousAppend();
  }
});

// CLIENT_SIDE.add(ClientSide.Ops.UnoptimizedAppend, (sexp: ClientSide.UnoptimizedAppend, builder) => {
//   let [,, value, trustingMorph] = sexp;

//   let { inlines } = builder.env.macros();
//   let returned = inlines.compile(sexp, builder) || value;

//   if (returned === true) return;

//   if (trustingMorph) {
//     builder.guardedTrustingAppend(returned[1]);
//   } else {
//     builder.guardedCautiousAppend(returned[1]);
//   }
// });

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
    let { symbols, hasEval } = layout!.symbolTable as ProgramSymbolTable;
    let stack = vm.evalStack;
    let { names: callerNames } = this;

    let scope = vm.pushRootScope(symbols.length + 1, true);
    scope.bindSelf(stack.pop<VersionedPathReference<Opaque>>());

    scope.bindBlock(symbols.indexOf(ATTRS_BLOCK) + 1, this.attrs);

    let lookup: Option<Dict<ScopeSlot>> = null;
    let $eval: Option<number> = -1;

    if (hasEval) {
      $eval = symbols.indexOf('$eval') + 1;
      lookup = dict<ScopeSlot>();
    }

    for (let i=callerNames.length - 1; i>=0; i--) {
      let symbol = symbols.indexOf(callerNames[i]);
      let value = stack.pop<VersionedPathReference<Opaque>>();

      if (symbol !== -1) scope.bindSymbol(symbol + 1, value);
      if (hasEval) lookup![callerNames[i]] = value;
    }

    let inverseSymbol = symbols.indexOf('&inverse');
    let inverse = stack.pop<Option<Block>>();

    if (inverseSymbol !== -1) {
      scope.bindBlock(inverseSymbol + 1, inverse);
    }

    if (lookup) lookup['&inverse'] = inverse;

    let defaultSymbol = symbols.indexOf('&default');
    let defaultBlock = stack.pop<Option<Block>>();

    if (defaultSymbol !== -1) {
      scope.bindBlock(defaultSymbol + 1, defaultBlock);
    }

    if (lookup) lookup['&default'] = defaultBlock;
    if (lookup) scope.bindEvalScope(lookup);

    vm.invoke(layout!);
  }

  toJSON() {
    return { GlimmerDebug: '<invoke-dynamic-layout>' };
  }
}

CLIENT_SIDE.add(ClientSide.Ops.ResolvedComponent, (sexp: ClientSide.ResolvedComponent, builder) => {
  let [,, definition, attrs, [, hash], block, inverse] = sexp;

  builder.pushComponentManager(definition);
  builder.invokeComponent(attrs, null, hash, block, inverse);
});

CLIENT_SIDE.add(ClientSide.Ops.ScannedComponent, (sexp: ClientSide.ScannedComponent, builder) => {
  let [,, tag, attrs, hash, rawBlock] = sexp;
  let block = rawBlock && rawBlock.scan();

  let definition = builder.env.getComponentDefinition(tag, builder.meta.templateMeta);

  builder.pushComponentManager(definition);
  builder.invokeComponent(attrs, null, hash, block);
});

export class PartialInvoker implements DynamicInvoker<ProgramSymbolTable> {
  constructor(private outerSymbols: string[], private evalInfo: WireFormat.Core.EvalInfo) {}

  invoke(vm: VM, partial: Option<CompiledDynamicProgram>) {
    if (partial) {
      let partialSymbols = partial.symbolTable.symbols;
      let outerScope = vm.scope();
      let partialScope = vm.pushRootScope(partialSymbols.length, false);
      partialScope.bindCallerScope(outerScope.getCallerScope());
      partialScope.bindEvalScope(outerScope.getEvalScope());
      partialScope.bindSelf(outerScope.getSelf());

      let { evalInfo, outerSymbols } = this;

      let locals = dict<VersionedPathReference<Opaque>>();

      evalInfo.forEach(slot => {
        let name = outerSymbols[slot - 1];
        let ref  = outerScope.getSymbol(slot);
        locals[name] = ref;
      });

      let evalScope = outerScope.getEvalScope()!;
      partialSymbols.forEach((name, i) => {
        let symbol = i + 1;
        let value = evalScope[name];

        if (value !== undefined) partialScope.bind(symbol, value);
      });

      partialScope.bindPartialMap(locals);

      vm.invoke(partial);
    }
  }
}

STATEMENTS.add(Ops.Partial, (sexp: S.Partial, builder) => {
  let [, name, evalInfo] = sexp;

  let { templateMeta, symbols } = builder.meta;

  function helper(vm: PublicVM, args: IArguments) {
    let { env } = vm;
    let nameRef = args.positional.at(0);

    return map(nameRef, name => {
      if (typeof name === 'string' && name) {
        if (!env.hasPartial(name, templateMeta)) {
          throw new Error(`Could not find a partial named "${name}"`);
        }

        return env.lookupPartial(name, templateMeta);
      } else if (name) {
        throw new Error(`Could not find a partial named "${String(name)}"`);
      } else {
        return null;
      }
    });
  }

  builder.startLabels();

  let definition = builder.local();
  expr([Ops.ClientSideExpression, ClientSide.Ops.ResolvedHelper, helper, [name], null], builder);

  builder.setLocal(definition);
  builder.getLocal(definition);
  builder.test('simple');

  builder.labelled(b => {
    b.jumpUnless('END');

    b.getLocal(definition);
    b.getPartialTemplate();
    b.compileDynamicBlock();
    b.invokeDynamic(new PartialInvoker(symbols, evalInfo));
    b.popScope();
  });
});

class InvokeDynamicYield implements DynamicInvoker<BlockSymbolTable> {
  constructor(private callerCount: number) {}

  invoke(vm: VM, block: Option<CompiledDynamicBlock>) {
    let { callerCount } = this;
    let stack = vm.evalStack;

    if (!block) {
      for (let i=callerCount-1; i>=0; i--) {
        stack.pop();
      }

      // To balance the popScope
      vm.pushCallerScope();

      return;
    }

    let table = block.symbolTable;
    let locals = table.parameters; // always present in inline blocks

    let calleeCount = locals ? locals.length : 0;

    vm.pushCallerScope(calleeCount > 0);

    let excess = Math.max(callerCount - calleeCount, 0);

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
  let count = compileList(params, builder);

  builder.getBlock(to);
  builder.compileDynamicBlock();
  builder.invokeDynamic(new InvokeDynamicYield(count));
  builder.popScope();
});

STATEMENTS.add(Ops.Debugger, (sexp: WireFormat.Statements.Debugger, builder: OpcodeBuilder) => {
  let [, evalInfo] = sexp;

  builder.debugger(builder.meta.symbols, evalInfo);
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

  if (builder.env.hasHelper(name, builder.meta.templateMeta)) {
    EXPRESSIONS.compile([Ops.Helper, name, EMPTY_ARRAY, null], builder);
  } else if (builder.meta.asPartial) {
    builder.resolveMaybeLocal(name);
  } else {
    builder.getVariable(0);
    builder.getProperty(name);
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
  let { env, meta } = builder;
  let [, name, params, hash] = sexp;

  if (env.hasHelper(name, meta.templateMeta)) {
    builder.compileArgs(params, hash, true);
    builder.helper(env.lookupHelper(name, meta.templateMeta));
  } else {
    throw new Error(`Compile Error: ${name} is not a helper`);
  }
});

CLIENT_SIDE_EXPRS.add(ClientSide.Ops.ResolvedHelper, (sexp: ClientSide.ResolvedHelper, builder) => {
  let [,, helper, params, hash] = sexp;

  builder.compileArgs(params, hash, true);
  builder.helper(helper);
});

EXPRESSIONS.add(Ops.Get, (sexp: E.Get, builder) => {
  let [, head, path] = sexp;
  builder.getVariable(head);
  path.forEach(p => builder.getProperty(p));
});

EXPRESSIONS.add(Ops.MaybeLocal, (sexp: E.MaybeLocal, builder) => {
  let [, path] = sexp;

  if (builder.meta.asPartial) {
    let head = path[0];
    path = path.slice(1);

    builder.resolveMaybeLocal(head);
  } else {
    builder.getVariable(0);
  }

  path.forEach(p => builder.getProperty(p));
});

EXPRESSIONS.add(Ops.Undefined, (_sexp, builder) => {
  return builder.primitive(undefined);
});

EXPRESSIONS.add(Ops.HasBlock, (sexp: E.HasBlock, builder) => {
  builder.hasBlock(sexp[1]);
});

EXPRESSIONS.add(Ops.HasBlockParams, (sexp: E.HasBlockParams, builder) => {
  builder.hasBlockParams(sexp[1]);
});

EXPRESSIONS.add(Ops.ClientSideExpression, (sexp: E.ClientSide, builder) => {
  CLIENT_SIDE_EXPRS.compile(sexp as ClientSide.ClientSideExpression, builder);
});

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

export type AppendSyntax = S.Append;
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
    let value = sexp[1];

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

  blocks.add('-in-element', (sexp, builder) => {
    let [,,, params,, _default] = sexp;

    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #-in-element requires a single argument`);
    }

    let element = builder.local();
    expr(params[0], builder);
    builder.setLocal(element);

    builder.getLocal(element);
    builder.test('simple');

    builder.labelled(b => {
      b.jumpUnless('END');
      b.getLocal(element);
      b.pushRemoteElement();
      b.invokeStatic(unwrap(_default));
      b.popRemoteElement();
    });
  });

  blocks.add('-with-dynamic-vars', (sexp: NestedBlockSyntax, builder) => {
    let [,,,, hash, _default] = sexp;

    if (hash) {
      let [names, expressions] = hash;

      compileList(expressions, builder);

      builder.unit(b => {
        b.pushDynamicScope();
        b.bindDynamicScope(names);
        b.invokeStatic(unwrap(_default));
        b.popDynamicScope();
      });
    } else {
      builder.invokeStatic(unwrap(_default));
    }
  });

  return { blocks, inlines };
}
