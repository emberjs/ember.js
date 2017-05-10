import { ScopeSlot } from '../environment';
import { CompiledDynamicBlock, CompiledDynamicProgram } from '../compiled/blocks';
import * as WireFormat from '@glimmer/wire-format';
import { BlockSymbolTable, ProgramSymbolTable } from '@glimmer/interfaces';
import OpcodeBuilder from '../compiled/opcodes/builder';
import { DynamicInvoker } from '../compiled/opcodes/vm';
import { VM, PublicVM } from '../vm';
import { IArguments } from '../vm/arguments';
import { Register } from '../opcodes';
import { IsComponentDefinitionReference } from '../compiled/opcodes/content';
import { ATTRS_BLOCK, Block, ClientSide, RawInlineBlock } from '../scanner';

import {
  LOGGER,
  EMPTY_ARRAY,
  Opaque,
  Option,
  Dict,
  dict,
  assert,
  unwrap,
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
    assert(!!func, `expected an implementation for ${this.offset === 0 ? Ops[sexp[0]] : ClientSide.Ops[sexp[1]]}`);
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

STATEMENTS.add(Ops.CloseElement, (_sexp: S.CloseElement, builder: OpcodeBuilder) => {
  LOGGER.trace('close-element statement');
  builder.closeElement();
});

STATEMENTS.add(Ops.FlushElement, (_sexp: S.FlushElement, builder: OpcodeBuilder) => {
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

STATEMENTS.add(Ops.DynamicAttr, (sexp: S.DynamicAttr, builder: OpcodeBuilder) => {
  dynamicAttr(sexp, false, builder);
});

STATEMENTS.add(Ops.TrustingAttr, (sexp: S.DynamicAttr, builder: OpcodeBuilder) => {
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

STATEMENTS.add(Ops.OpenElement, (sexp: S.OpenElement, builder: OpcodeBuilder) => {
  builder.openPrimitiveElement(sexp[1]);
});

CLIENT_SIDE.add(ClientSide.Ops.OpenComponentElement, (sexp: ClientSide.OpenComponentElement, builder: OpcodeBuilder) => {
  builder.pushComponentOperations();
  builder.openElementWithOperations(sexp[2]);
});

CLIENT_SIDE.add(ClientSide.Ops.DidCreateElement, (_sexp: ClientSide.DidCreateElement, builder: OpcodeBuilder) => {
  builder.didCreateElement(Register.s0);
});

CLIENT_SIDE.add(ClientSide.Ops.DidRenderLayout, (_sexp: ClientSide.DidRenderLayout, builder: OpcodeBuilder) => {
  builder.didRenderLayout(Register.s0);
});

STATEMENTS.add(Ops.Append, (sexp: S.Append, builder: OpcodeBuilder) => {
  let [, value, trusting] = sexp;

  let { inlines } = builder.env.macros();
  let returned = inlines.compile(sexp, builder) || value;

  if (returned === true) return;

  let isGet = E.isGet(value);
  let isMaybeLocal = E.isMaybeLocal(value);

  if (trusting) {
    builder.guardedAppend(value, true);
  } else {
    if (isGet || isMaybeLocal) {
      builder.guardedAppend(value, false);
    } else {
      expr(value, builder);
      builder.cautiousAppend();
    }
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

STATEMENTS.add(Ops.Block, (sexp: S.Block, builder: OpcodeBuilder) => {
  let [, name, params, hash, _template, _inverse] = sexp;
  let template = builder.template(_template);
  let inverse = builder.template(_inverse);

  let templateBlock = template && template.scan();
  let inverseBlock = inverse && inverse.scan();

  let { blocks } = builder.env.macros();
  blocks.compile(name, params, hash, templateBlock, inverseBlock, builder);
});

export class InvokeDynamicLayout implements DynamicInvoker<ProgramSymbolTable> {
  constructor(private attrs: Option<Block>) {}

  invoke(vm: VM, layout: Option<CompiledDynamicProgram>) {
    let { symbols, hasEval } = layout!.symbolTable as ProgramSymbolTable;
    let stack = vm.stack;

    let scope = vm.pushRootScope(symbols.length + 1, true);
    scope.bindSelf(stack.pop<VersionedPathReference<Opaque>>());

    scope.bindBlock(symbols.indexOf(ATTRS_BLOCK) + 1, this.attrs);

    let lookup: Option<Dict<ScopeSlot>> = null;
    let $eval: Option<number> = -1;

    if (hasEval) {
      $eval = symbols.indexOf('$eval') + 1;
      lookup = dict<ScopeSlot>();
    }

    let callerNames = stack.pop<string[]>();

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

    vm.pushFrame();
    vm.call(layout!.start);
  }

  toJSON() {
    return { GlimmerDebug: '<invoke-dynamic-layout>' };
  }
}

STATEMENTS.add(Ops.Component, (sexp: S.Component, builder: OpcodeBuilder) => {
  let [, tag, attrs, args, block] = sexp;

  if (builder.env.hasComponentDefinition(tag, builder.meta.templateMeta)) {
    let child = builder.template(block);
    let attrsBlock = new RawInlineBlock(builder.env, builder.meta, attrs, EMPTY_ARRAY);
    let definition = builder.env.getComponentDefinition(tag, builder.meta.templateMeta);
    builder.pushComponentManager(definition);
    builder.invokeComponent(attrsBlock, null, args, child && child.scan());
  } else if (block && block.parameters.length) {
    throw new Error(`Compile Error: Cannot find component ${tag}`);
  } else {
    builder.openPrimitiveElement(tag);
    attrs.forEach(attr => STATEMENTS.compile(attr, builder));
    builder.flushElement();
    if (block) block.statements.forEach(s => STATEMENTS.compile(s, builder));
    builder.closeElement();
  }
});

export class PartialInvoker implements DynamicInvoker<ProgramSymbolTable> {
  constructor(private outerSymbols: string[], private evalInfo: WireFormat.Core.EvalInfo) {}

  invoke(vm: VM, _partial: Option<CompiledDynamicProgram>) {
    let partial = unwrap(_partial);
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

    vm.pushFrame();
    vm.call(partial.start);
  }
}

STATEMENTS.add(Ops.Partial, (sexp: S.Partial, builder: OpcodeBuilder) => {
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

  builder.pushFrame();

  builder.returnTo('END');

  expr(name, builder);
  builder.pushImmediate(EMPTY_ARRAY);
  builder.pushArgs(1, true);
  builder.helper(helper);

  builder.dup();
  builder.test('simple');

  builder.enter(2);

  builder.jumpUnless('ELSE');

  builder.getPartialTemplate();
  builder.compileDynamicBlock();
  builder.invokeDynamic(new PartialInvoker(symbols, evalInfo));
  builder.popScope();
  builder.popFrame();

  builder.label('ELSE');
  builder.exit();
  builder.return();

  builder.label('END');
  builder.popFrame();

  builder.stopLabels();
});

class InvokeDynamicYield implements DynamicInvoker<BlockSymbolTable> {
  constructor(private callerCount: number) {}

  invoke(vm: VM, block: Option<CompiledDynamicBlock>) {
    let { callerCount } = this;
    let stack = vm.stack;

    if (!block) {
      // To balance the pop{Frame,Scope}
      vm.pushFrame();
      vm.pushCallerScope();

      return;
    }

    let table = block.symbolTable;
    let locals = table.parameters; // always present in inline blocks

    let calleeCount = locals ? locals.length : 0;
    let count = Math.min(callerCount, calleeCount);

    vm.pushFrame();
    vm.pushCallerScope(calleeCount > 0);

    let scope = vm.scope();

    for (let i=0; i<count; i++) {
      scope.bindSymbol(locals![i], stack.fromBase<VersionedPathReference<Opaque>>(callerCount-i));
    }

    vm.call(block.start);
  }

  toJSON() {
    return { GlimmerDebug: `<invoke-dynamic-yield caller-count=${this.callerCount}>` };
  }
}

STATEMENTS.add(Ops.Yield, (sexp: WireFormat.Statements.Yield, builder: OpcodeBuilder) => {
  let [, to, params] = sexp;

  let count = compileList(params, builder);

  builder.getBlock(to);
  builder.compileDynamicBlock();
  builder.invokeDynamic(new InvokeDynamicYield(count));
  builder.popScope();
  builder.popFrame();

  if (count) {
    builder.pop(count);
  }
});

STATEMENTS.add(Ops.Debugger, (sexp: WireFormat.Statements.Debugger, builder: OpcodeBuilder) => {
  let [, evalInfo] = sexp;

  builder.debugger(builder.meta.symbols, evalInfo);
});

STATEMENTS.add(Ops.ClientSideStatement, (sexp: WireFormat.Statements.ClientSide, builder: OpcodeBuilder) => {
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

EXPRESSIONS.add(Ops.Get, (sexp: E.Get, builder: OpcodeBuilder) => {
  let [, head, path] = sexp;
  builder.getVariable(head);
  path.forEach(p => builder.getProperty(p));
});

EXPRESSIONS.add(Ops.MaybeLocal, (sexp: E.MaybeLocal, builder: OpcodeBuilder) => {
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

EXPRESSIONS.add(Ops.HasBlock, (sexp: E.HasBlock, builder: OpcodeBuilder) => {
  builder.hasBlock(sexp[1]);
});

EXPRESSIONS.add(Ops.HasBlockParams, (sexp: E.HasBlockParams, builder: OpcodeBuilder) => {
  builder.hasBlockParams(sexp[1]);
});

EXPRESSIONS.add(Ops.ClientSideExpression, (sexp: E.ClientSide, builder: OpcodeBuilder) => {
  CLIENT_SIDE_EXPRS.compile(sexp as ClientSide.ClientSideExpression, builder);
});

export function compileList(params: Option<WireFormat.Expression[]>, builder: OpcodeBuilder): number {
  if (!params) return 0;
  params.forEach(p => expr(p, builder));
  return params.length;
}

export type BlockMacro = (params: C.Params, hash: C.Hash, template: Option<Block>, inverse: Option<Block>, builder: OpcodeBuilder) => void;
export type MissingBlockMacro = (name: string, params: C.Params, hash: C.Hash, template: Option<Block>, inverse: Option<Block>, builder: OpcodeBuilder) => void;

export class Blocks {
  private names = dict<number>();
  private funcs: BlockMacro[] = [];
  private missing: MissingBlockMacro;

  add(name: string, func: BlockMacro) {
    this.funcs.push(func);
    this.names[name] = this.funcs.length - 1;
  }

  addMissing(func: MissingBlockMacro) {
    this.missing = func;
  }

  compile(name: string, params: C.Params, hash: C.Hash, template: Option<Block>, inverse: Option<Block>, builder: OpcodeBuilder): void {
    let index = this.names[name];

    if (index === undefined) {
      assert(!!this.missing, `${name} not found, and no catch-all block handler was registered`);
      let func = this.missing;
      let handled = func(name, params, hash, template, inverse, builder);
      assert(!!handled, `${name} not found, and the catch-all block handler didn't handle it`);
    } else {
      let func = this.funcs[index];
      func(params, hash, template, inverse, builder);
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
  blocks.add('if', (params, _hash, template, inverse, builder) => {
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

    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #if requires a single argument`);
    }

    builder.startLabels();

    builder.pushFrame();

    builder.returnTo('END');

    expr(params[0], builder);

    builder.test('environment');

    builder.enter(1);

    builder.jumpUnless('ELSE');

    builder.invokeStatic(unwrap(template));

    if (inverse) {
      builder.jump('EXIT');

      builder.label('ELSE');
      builder.invokeStatic(inverse);

      builder.label('EXIT');
      builder.exit();
      builder.return();
    } else {
      builder.label('ELSE');
      builder.exit();
      builder.return();
    }

    builder.label('END');
    builder.popFrame();

    builder.stopLabels();
  });

  blocks.add('unless', (params, _hash, template, inverse, builder) => {
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

    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #unless requires a single argument`);
    }

    builder.startLabels();

    builder.pushFrame();

    builder.returnTo('END');

    expr(params[0], builder);

    builder.test('environment');

    builder.enter(1);

    builder.jumpIf('ELSE');

    builder.invokeStatic(unwrap(template));

    if (inverse) {
      builder.jump('EXIT');

      builder.label('ELSE');
      builder.invokeStatic(inverse);

      builder.label('EXIT');
      builder.exit();
      builder.return();
    } else {
      builder.label('ELSE');
      builder.exit();
      builder.return();
    }

    builder.label('END');
    builder.popFrame();

    builder.stopLabels();
  });

  blocks.add('with', (params, _hash, template, inverse, builder) => {
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

    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #with requires a single argument`);
    }

    builder.startLabels();

    builder.pushFrame();

    builder.returnTo('END');

    expr(params[0], builder);

    builder.dup();
    builder.test('environment');

    builder.enter(2);

    builder.jumpUnless('ELSE');

    builder.invokeStatic(unwrap(template), 1);

    if (inverse) {
      builder.jump('EXIT');

      builder.label('ELSE');
      builder.invokeStatic(inverse);

      builder.label('EXIT');
      builder.exit();
      builder.return();
    } else {
      builder.label('ELSE');
      builder.exit();
      builder.return();
    }

    builder.label('END');
    builder.popFrame();

    builder.stopLabels();
  });

  blocks.add('each', (params, hash, template, inverse, builder) => {
    //         Enter(BEGIN, END)
    // BEGIN:  Noop
    //         PutArgs
    //         PutIterable
    //         JumpUnless(ELSE)
    //         EnterList(BEGIN2, END2)
    // ITER:   Noop
    //         NextIter(BREAK)
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

    builder.startLabels();

    builder.pushFrame();

    builder.returnTo('END');

    if (hash && hash[0][0] === 'key') {
      expr(hash[1][0], builder);
    } else {
      throw new Error('Compile error: #each without key');
    }

    expr(params[0], builder);

    builder.enter(2);

    builder.putIterator();

    builder.jumpUnless('ELSE');

    builder.pushFrame();

    builder.returnTo('ITER');

    builder.dup(Register.fp, 1);

    builder.enterList('BODY');

    builder.label('ITER');
    builder.iterate('BREAK');

    builder.label('BODY');
    builder.invokeStatic(unwrap(template), 2);
    builder.pop(2);
    builder.exit();
    builder.return();

    builder.label('BREAK');
    builder.exitList();
    builder.popFrame();

    if (inverse) {
      builder.jump('EXIT');

      builder.label('ELSE');
      builder.invokeStatic(inverse);

      builder.label('EXIT');
      builder.exit();
      builder.return();
    } else {
      builder.label('ELSE');
      builder.exit();
      builder.return();
    }

    builder.label('END');
    builder.popFrame();

    builder.stopLabels();
  });

  blocks.add('-in-element', (params, hash, template, _inverse, builder) => {
    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #-in-element requires a single argument`);
    }

    builder.startLabels();

    builder.pushFrame();

    builder.returnTo('END');

    if (hash && hash[0].length) {
      let [ keys, values ] = hash;

      if (keys.length === 1 && keys[0] === 'nextSibling') {
        expr(values[0], builder);
      } else {
        throw new Error(`SYNTAX ERROR: #-in-element does not take a \`${keys[0]}\` option`);
      }
    } else {
      expr(null, builder);
    }

    expr(params[0], builder);

    builder.dup();
    builder.test('simple');

    builder.enter(3);

    builder.jumpUnless('ELSE');

    builder.pushRemoteElement();
    builder.invokeStatic(unwrap(template));
    builder.popRemoteElement();

    builder.label('ELSE');
    builder.exit();
    builder.return();

    builder.label('END');
    builder.popFrame();

    builder.stopLabels();
  });

  blocks.add('-with-dynamic-vars', (_params, hash, template, _inverse, builder) => {
    if (hash) {
      let [names, expressions] = hash;

      compileList(expressions, builder);

      builder.pushDynamicScope();
      builder.bindDynamicScope(names);
      builder.invokeStatic(unwrap(template));
      builder.popDynamicScope();
    } else {
      builder.invokeStatic(unwrap(template));
    }
  });

  return { blocks, inlines };
}
