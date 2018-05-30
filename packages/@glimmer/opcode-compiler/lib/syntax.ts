import { CompilableBlock, Option, Opaque, Compiler } from '@glimmer/interfaces';
import { assert, dict, unwrap, EMPTY_ARRAY } from '@glimmer/util';
import { Register } from '@glimmer/vm';
import * as WireFormat from '@glimmer/wire-format';
import * as ClientSide from './client-side';
import OpcodeBuilder from './opcode-builder';

import Ops = WireFormat.Ops;
import S = WireFormat.Statements;
import E = WireFormat.Expressions;
import C = WireFormat.Core;

export type TupleSyntax = WireFormat.Statement | WireFormat.TupleExpression;
export type CompilerFunction<T extends TupleSyntax> = ((
  sexp: T,
  builder: OpcodeBuilder<Opaque>
) => void);

export const ATTRS_BLOCK = '&attrs';

export class Compilers<Syntax extends TupleSyntax> {
  private names = dict<number>();
  private funcs: CompilerFunction<Syntax>[] = [];

  constructor(private offset = 0) {}

  add<T extends Syntax>(name: number, func: CompilerFunction<T>): void {
    this.funcs.push(func as CompilerFunction<Syntax>);
    this.names[name] = this.funcs.length - 1;
  }

  compile(sexp: Syntax, builder: OpcodeBuilder<Opaque>): void {
    let name: number = sexp[this.offset];
    let index = this.names[name];
    let func = this.funcs[index];
    assert(
      !!func,
      `expected an implementation for ${this.offset === 0 ? Ops[sexp[0]] : ClientSide.Ops[sexp[1]]}`
    );
    func(sexp, builder);
  }
}

let _statementCompiler: Compilers<WireFormat.Statement>;

export function statementCompiler(): Compilers<WireFormat.Statement> {
  if (_statementCompiler) {
    return _statementCompiler;
  }

  const STATEMENTS = (_statementCompiler = new Compilers<WireFormat.Statement>());

  STATEMENTS.add(Ops.Text, (sexp: S.Text, builder) => {
    builder.text(sexp[1]);
  });

  STATEMENTS.add(Ops.Comment, (sexp: S.Comment, builder) => {
    builder.comment(sexp[1]);
  });

  STATEMENTS.add(Ops.CloseElement, (_sexp: S.CloseElement, builder) => {
    builder.closeElement();
  });

  STATEMENTS.add(Ops.FlushElement, (_sexp: S.FlushElement, builder) => {
    builder.flushElement();
  });

  STATEMENTS.add(Ops.Modifier, (sexp: S.Modifier, builder) => {
    let { referrer } = builder;
    let [, name, params, hash] = sexp;

    let handle = builder.compiler.resolveModifier(name, referrer);

    if (handle !== null) {
      builder.modifier(handle, params, hash);
    } else {
      throw new Error(
        `Compile Error ${name} is not a modifier: Helpers may not be used in the element form.`
      );
    }
  });

  STATEMENTS.add(Ops.StaticAttr, (sexp: S.StaticAttr, builder) => {
    let [, name, value, namespace] = sexp;
    builder.staticAttr(name, namespace, value as string);
  });

  STATEMENTS.add(Ops.DynamicAttr, (sexp: S.DynamicAttr, builder) => {
    dynamicAttr(sexp, false, builder);
  });

  STATEMENTS.add(Ops.TrustingAttr, (sexp: S.DynamicAttr, builder) => {
    dynamicAttr(sexp, true, builder);
  });

  STATEMENTS.add(Ops.OpenElement, (sexp: S.OpenElement, builder) => {
    builder.openPrimitiveElement(sexp[1]);
  });

  STATEMENTS.add(Ops.OpenSplattedElement, (sexp: S.SplatElement, builder) => {
    builder.setComponentAttrs(true);
    builder.putComponentOperations();
    builder.openPrimitiveElement(sexp[1]);
  });

  STATEMENTS.add(Ops.DynamicComponent, (sexp: S.DynamicComponent, builder) => {
    let [, definition, attrs, args, template] = sexp;

    let block = builder.template(template);
    builder.dynamicComponent(definition, null, args, false, block, null);
  });

  STATEMENTS.add(Ops.Component, (sexp: S.Component, builder) => {
    let [, tag, _attrs, args, block] = sexp;
    let { referrer } = builder;

    let { handle, capabilities, compilable } = builder.compiler.resolveLayoutForTag(tag, referrer);

    if (handle !== null && capabilities !== null) {
      let attrs: WireFormat.Statement[] = [
        [Ops.ClientSideStatement, ClientSide.Ops.SetComponentAttrs, true],
        ..._attrs,
        [Ops.ClientSideStatement, ClientSide.Ops.SetComponentAttrs, false],
      ];
      let attrsBlock = builder.inlineBlock({ statements: attrs, parameters: EMPTY_ARRAY });
      let child = builder.template(block);

      if (compilable) {
        builder.pushComponentDefinition(handle);
        builder.invokeStaticComponent(
          capabilities,
          compilable,
          attrsBlock,
          null,
          args,
          false,
          child && child
        );
      } else {
        builder.pushComponentDefinition(handle);
        builder.invokeComponent(capabilities, attrsBlock, null, args, false, child && child);
      }
    } else {
      throw new Error(`Compile Error: Cannot find component ${tag}`);
    }
  });

  STATEMENTS.add(Ops.Partial, (sexp: S.Partial, builder) => {
    let [, name, evalInfo] = sexp;

    let { referrer } = builder;

    builder.replayableIf({
      args() {
        builder.expr(name);
        builder.dup();
        return 2;
      },

      ifTrue() {
        builder.invokePartial(referrer, builder.evalSymbols()!, evalInfo);
        builder.popScope();
        builder.popFrame(); // FIXME: WAT
      },
    });
  });

  STATEMENTS.add(Ops.Yield, (sexp: WireFormat.Statements.Yield, builder) => {
    let [, to, params] = sexp;

    builder.yield(to, params);
  });

  STATEMENTS.add(Ops.AttrSplat, (sexp: WireFormat.Statements.AttrSplat, builder) => {
    let [, to] = sexp;

    builder.yield(to, []);
    builder.setComponentAttrs(false);
  });

  STATEMENTS.add(Ops.Debugger, (sexp: WireFormat.Statements.Debugger, builder) => {
    let [, evalInfo] = sexp;

    builder.debugger(builder.evalSymbols()!, evalInfo);
  });

  STATEMENTS.add(Ops.ClientSideStatement, (sexp: WireFormat.Statements.ClientSide, builder) => {
    CLIENT_SIDE.compile(sexp as ClientSide.ClientSideStatement, builder);
  });

  STATEMENTS.add(Ops.Append, (sexp: S.Append, builder) => {
    let [, value, trusting] = sexp;

    let returned = builder.compileInline(sexp) || value;

    if (returned === true) return;

    builder.guardedAppend(value, trusting);
  });

  STATEMENTS.add(Ops.Block, (sexp: S.Block, builder) => {
    let [, name, params, hash, _template, _inverse] = sexp;
    let template = builder.template(_template);
    let inverse = builder.template(_inverse);

    let templateBlock = template && template;
    let inverseBlock = inverse && inverse;

    builder.compileBlock(name, params, hash, templateBlock, inverseBlock);
  });

  const CLIENT_SIDE = new Compilers<ClientSide.ClientSideStatement>(1);

  CLIENT_SIDE.add(
    ClientSide.Ops.OpenComponentElement,
    (sexp: ClientSide.OpenComponentElement, builder: OpcodeBuilder) => {
      builder.putComponentOperations();
      builder.openPrimitiveElement(sexp[2]);
    }
  );

  CLIENT_SIDE.add(
    ClientSide.Ops.DidCreateElement,
    (_sexp: ClientSide.DidCreateElement, builder: OpcodeBuilder) => {
      builder.didCreateElement(Register.s0);
    }
  );

  CLIENT_SIDE.add(
    ClientSide.Ops.SetComponentAttrs,
    (sexp: ClientSide.SetComponentAttrs, builder: OpcodeBuilder) => {
      builder.setComponentAttrs(sexp[2]);
    }
  );

  CLIENT_SIDE.add(ClientSide.Ops.Debugger, () => {
    // tslint:disable-next-line:no-debugger
    debugger;
  });

  CLIENT_SIDE.add(
    ClientSide.Ops.DidRenderLayout,
    (_sexp: ClientSide.DidRenderLayout, builder: OpcodeBuilder) => {
      builder.didRenderLayout(Register.s0);
    }
  );

  return STATEMENTS;
}

function dynamicAttr<Locator>(
  sexp: S.DynamicAttr | S.TrustingAttr,
  trusting: boolean,
  builder: OpcodeBuilder<Locator>
) {
  let [, name, value, namespace] = sexp;

  builder.expr(value);

  if (namespace) {
    builder.dynamicAttr(name, namespace, trusting);
  } else {
    builder.dynamicAttr(name, null, trusting);
  }
}

let _expressionCompiler: Compilers<WireFormat.TupleExpression>;

export function expressionCompiler() {
  if (_expressionCompiler) {
    return _expressionCompiler;
  }

  const EXPRESSIONS = (_expressionCompiler = new Compilers<WireFormat.TupleExpression>());

  EXPRESSIONS.add(Ops.Unknown, (sexp: E.Unknown, builder) => {
    let {
      compiler,
      referrer,
      containingLayout: { asPartial },
    } = builder;
    let name = sexp[1];

    let handle = compiler.resolveHelper(name, referrer);

    if (handle !== null) {
      builder.helper(handle, null, null);
    } else if (asPartial) {
      builder.resolveMaybeLocal(name);
    } else {
      builder.getVariable(0);
      builder.getProperty(name);
    }
  });

  EXPRESSIONS.add(Ops.Concat, (sexp: E.Concat, builder) => {
    let parts = sexp[1];
    for (let i = 0; i < parts.length; i++) {
      builder.expr(parts[i]);
    }
    builder.concat(parts.length);
  });

  EXPRESSIONS.add(Ops.Helper, (sexp: E.Helper, builder) => {
    let { compiler, referrer } = builder;
    let [, name, params, hash] = sexp;

    // TODO: triage this in the WF compiler
    if (name === 'component') {
      assert(params.length, 'SYNTAX ERROR: component helper requires at least one argument');

      let [definition, ...restArgs] = params;
      builder.curryComponent(definition, restArgs, hash, true);
      return;
    }

    let handle = compiler.resolveHelper(name, referrer);

    if (handle !== null) {
      builder.helper(handle, params, hash);
    } else {
      throw new Error(`Compile Error: ${name} is not a helper`);
    }
  });

  EXPRESSIONS.add(Ops.Get, (sexp: E.Get, builder) => {
    let [, head, path] = sexp;
    builder.getVariable(head);
    for (let i = 0; i < path.length; i++) {
      builder.getProperty(path[i]);
    }
  });

  EXPRESSIONS.add(Ops.MaybeLocal, (sexp: E.MaybeLocal, builder) => {
    let [, path] = sexp;

    if (builder.containingLayout.asPartial) {
      let head = path[0];
      path = path.slice(1);

      builder.resolveMaybeLocal(head);
    } else {
      builder.getVariable(0);
    }

    for (let i = 0; i < path.length; i++) {
      builder.getProperty(path[i]);
    }
  });

  EXPRESSIONS.add(Ops.Undefined, (_sexp, builder) => {
    return builder.pushPrimitiveReference(undefined);
  });

  EXPRESSIONS.add(Ops.HasBlock, (sexp: E.HasBlock, builder) => {
    builder.hasBlock(sexp[1]);
  });

  EXPRESSIONS.add(Ops.HasBlockParams, (sexp: E.HasBlockParams, builder) => {
    builder.hasBlockParams(sexp[1]);
  });

  return EXPRESSIONS;
}

export class Macros {
  public blocks: Blocks;
  public inlines: Inlines;

  constructor() {
    let { blocks, inlines } = populateBuiltins();
    this.blocks = blocks;
    this.inlines = inlines;
  }
}

export type BlockMacro<Locator> = (
  params: C.Params,
  hash: C.Hash,
  template: Option<CompilableBlock>,
  inverse: Option<CompilableBlock>,
  builder: OpcodeBuilder<Locator>
) => void;
export type MissingBlockMacro<Locator> = (
  name: string,
  params: C.Params,
  hash: C.Hash,
  template: Option<CompilableBlock>,
  inverse: Option<CompilableBlock>,
  builder: OpcodeBuilder<Locator>
) => void;

export class Blocks {
  private names = dict<number>();
  private funcs: BlockMacro<Opaque>[] = [];
  private missing: MissingBlockMacro<Opaque> | undefined;

  add<Locator>(name: string, func: BlockMacro<Locator>) {
    this.funcs.push(func as BlockMacro<Opaque>);
    this.names[name] = this.funcs.length - 1;
  }

  addMissing<Locator>(func: MissingBlockMacro<Locator>) {
    this.missing = func as MissingBlockMacro<Opaque>;
  }

  compile<Locator>(
    name: string,
    params: C.Params,
    hash: C.Hash,
    template: Option<CompilableBlock>,
    inverse: Option<CompilableBlock>,
    builder: OpcodeBuilder<Locator>
  ): void {
    let index = this.names[name];

    if (index === undefined) {
      assert(!!this.missing, `${name} not found, and no catch-all block handler was registered`);
      let func = this.missing!;
      let handled = func(name, params, hash, template, inverse, builder);
      assert(!!handled, `${name} not found, and the catch-all block handler didn't handle it`);
    } else {
      let func = this.funcs[index];
      func(params, hash, template, inverse, builder);
    }
  }
}

export type AppendSyntax = S.Append;
export type AppendMacro<Locator> = (
  name: string,
  params: Option<C.Params>,
  hash: Option<C.Hash>,
  builder: OpcodeBuilder<Locator>
) => ['expr', WireFormat.Expression] | true | false;

export class Inlines {
  private names = dict<number>();
  private funcs: AppendMacro<Opaque>[] = [];
  private missing: AppendMacro<Opaque> | undefined;

  add<Locator>(name: string, func: AppendMacro<Locator>) {
    this.funcs.push(func as AppendMacro<Opaque>);
    this.names[name] = this.funcs.length - 1;
  }

  addMissing<Locator>(func: AppendMacro<Locator>) {
    this.missing = func as AppendMacro<Opaque>;
  }

  compile<Locator>(
    sexp: AppendSyntax,
    builder: OpcodeBuilder<Locator>
  ): ['expr', WireFormat.Expression] | true {
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

export function populateBuiltins(
  blocks: Blocks = new Blocks(),
  inlines: Inlines = new Inlines()
): { blocks: Blocks; inlines: Inlines } {
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

    builder.replayableIf({
      args() {
        builder.expr(params[0]);
        builder.toBoolean();
        return 1;
      },

      ifTrue() {
        builder.invokeStaticBlock(unwrap(template));
      },

      ifFalse() {
        if (inverse) {
          builder.invokeStaticBlock(inverse);
        }
      },
    });
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

    builder.replayableIf({
      args() {
        builder.expr(params[0]);
        builder.toBoolean();
        return 1;
      },

      ifTrue() {
        if (inverse) {
          builder.invokeStaticBlock(inverse);
        }
      },

      ifFalse() {
        builder.invokeStaticBlock(unwrap(template));
      },
    });
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

    builder.replayableIf({
      args() {
        builder.expr(params[0]);
        builder.dup();
        builder.toBoolean();
        return 2;
      },

      ifTrue() {
        builder.invokeStaticBlock(unwrap(template), 1);
      },

      ifFalse() {
        if (inverse) {
          builder.invokeStaticBlock(inverse);
        }
      },
    });
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

    builder.replayable({
      args() {
        if (hash && hash[0][0] === 'key') {
          builder.expr(hash[1][0]);
        } else {
          builder.pushPrimitiveReference(null);
        }

        builder.expr(params[0]);

        return 2;
      },

      body() {
        builder.putIterator();

        builder.jumpUnless('ELSE');

        builder.pushFrame();

        builder.dup(Register.fp, 1);

        builder.returnTo('ITER');
        builder.enterList('BODY');

        builder.label('ITER');
        builder.iterate('BREAK');

        builder.label('BODY');
        builder.invokeStaticBlock(unwrap(template), 2);
        builder.pop(2);
        builder.jump('FINALLY');

        builder.label('BREAK');
        builder.exitList();
        builder.popFrame();

        builder.jump('FINALLY');
        builder.label('ELSE');

        if (inverse) {
          builder.invokeStaticBlock(inverse);
        }
      },
    });
  });

  blocks.add('in-element', (params, hash, template, _inverse, builder) => {
    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #in-element requires a single argument`);
    }

    builder.replayableIf({
      args() {
        let [keys, values] = hash!;

        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];
          if (key === 'nextSibling' || key === 'guid') {
            builder.expr(values[i]);
          } else {
            throw new Error(`SYNTAX ERROR: #in-element does not take a \`${keys[0]}\` option`);
          }
        }

        builder.expr(params[0]);

        builder.dup();

        return 4;
      },

      ifTrue() {
        builder.pushRemoteElement();
        builder.invokeStaticBlock(unwrap(template));
        builder.popRemoteElement();
      },
    });
  });

  blocks.add('-with-dynamic-vars', (_params, hash, template, _inverse, builder) => {
    if (hash) {
      let [names, expressions] = hash;

      builder.compileParams(expressions);

      builder.pushDynamicScope();
      builder.bindDynamicScope(names);
      builder.invokeStaticBlock(unwrap(template));
      builder.popDynamicScope();
    } else {
      builder.invokeStaticBlock(unwrap(template));
    }
  });

  blocks.add('component', (_params, hash, template, inverse, builder) => {
    assert(_params && _params.length, 'SYNTAX ERROR: #component requires at least one argument');

    let tag = _params[0];
    if (typeof tag === 'string') {
      let returned = builder.staticComponentHelper(_params[0] as string, hash, template);
      if (returned) return;
    }

    let [definition, ...params] = _params!;
    builder.dynamicComponent(definition, params, hash, true, template, inverse);
  });

  inlines.add('component', (_name, _params, hash, builder) => {
    assert(
      _params && _params.length,
      'SYNTAX ERROR: component helper requires at least one argument'
    );

    let tag = _params && _params[0];
    if (typeof tag === 'string') {
      let returned = builder.staticComponentHelper(tag as string, hash, null);
      if (returned) return true;
    }

    let [definition, ...params] = _params!;
    builder.dynamicComponent(definition, params, hash, true, null, null);

    return true;
  });

  return { blocks, inlines };
}

export interface CompileOptions<Locator, Builder = Opaque> {
  compiler: Compiler<Builder>;
  asPartial: boolean;
  referrer: Locator;
}
