import * as WireFormat from 'glimmer-wire-format';
import OpcodeBuilder from '../compiled/opcodes/builder';
import { CompiledExpression } from '../compiled/expressions';
import CompiledValue from '../compiled/expressions/value';
import { BaselineSyntax } from '../scanner';
import { Opaque, Option, dict, assert, unwrap, unreachable } from 'glimmer-util';
import { ModifierOpcode } from '../compiled/opcodes/dom';
import CompiledLookup, { CompiledSelf, CompiledSymbol } from '../compiled/expressions/lookups';
import { OptimizedTrustingAppendOpcode, OptimizedCautiousAppendOpcode } from '../compiled/opcodes/content';
import CompiledHelper from '../compiled/expressions/helper';
import CompiledConcat from '../compiled/expressions/concat';
import {
  COMPILED_EMPTY_POSITIONAL_ARGS,
  COMPILED_EMPTY_NAMED_ARGS,
  EMPTY_BLOCKS,
  CompiledArgs,
  CompiledPositionalArgs,
  CompiledNamedArgs
} from '../compiled/expressions/args';

export type SexpExpression = WireFormat.Expression & { 0: string };
export type Syntax = SexpExpression | BaselineSyntax.AnyStatement;
export type CompilerFunction<T extends Syntax, U> = (sexp: T, builder: OpcodeBuilder) => U;
export type Name = BaselineSyntax.AnyStatement[0];

export class Compilers<T extends Syntax, CompileTo> {
  private names = dict<number>();
  private funcs: CompilerFunction<T, CompileTo>[] = [];

  add(name: T[0], func: CompilerFunction<T, CompileTo>) {
    this.funcs.push(func);
    this.names[name] = this.funcs.length - 1;
  }

  compile(sexp: T, builder: OpcodeBuilder): CompileTo {
    let name: T[0] = sexp[0];
    let index = this.names[name];
    let func = this.funcs[index];
    assert(!!func, `expected an implementation for ${sexp[0]}`);
    return func(sexp, builder);
  }
}

import S = WireFormat.Statements;

export const STATEMENTS = new Compilers<BaselineSyntax.AnyStatement, void>();

STATEMENTS.add('text', (sexp: S.Text, builder: OpcodeBuilder) => {
  builder.text(sexp[1]);
});

STATEMENTS.add('close-element', (sexp: S.CloseElement, builder: OpcodeBuilder) => {
  builder.closeElement();
});

STATEMENTS.add('flush-element', (sexp: S.FlushElement, builder: OpcodeBuilder) => {
  builder.flushElement();
});

STATEMENTS.add('modifier', (sexp: S.Modifier, builder: OpcodeBuilder) => {
  let [, path, params, hash] = sexp;

  let args = compileArgs(params, hash, builder);

  if (builder.env.hasModifier(path, builder.symbolTable)) {
    builder.append(new ModifierOpcode(
      path[0],
      builder.env.lookupModifier(path, builder.symbolTable),
      args
    ));
  } else {
    throw new Error(`Compile Error: ${path.join('.')} is not a modifier`);
  }
});

STATEMENTS.add('static-attr', (sexp: S.StaticAttr, builder: OpcodeBuilder) => {
  let [, name, value, namespace] = sexp;
  builder.staticAttr(name, namespace, value);
});

STATEMENTS.add('any-dynamic-attr', (sexp: BaselineSyntax.AnyDynamicAttr, builder: OpcodeBuilder) => {
  let [, name, value, namespace, trusting] = sexp;

  builder.putValue(expr(value, builder));

  if (namespace) {
    builder.dynamicAttrNS(name, namespace, trusting);
  } else {
    builder.dynamicAttr(name, trusting);
  }
});

STATEMENTS.add('open-primitive-element', (sexp: BaselineSyntax.OpenPrimitiveElement, builder: OpcodeBuilder) => {
  builder.openPrimitiveElement(sexp[1]);
});

STATEMENTS.add('optimized-append', (sexp: BaselineSyntax.OptimizedAppend, builder: OpcodeBuilder) => {
  let [, value, trustingMorph] = sexp;

  builder.putValue(expr(value, builder));
  if (Array.isArray(value)) {
    builder.putValue(EXPRESSIONS.compile(value, builder));
  } else {
    builder.putValue(new CompiledValue(value));
  }

  if (trustingMorph) {
    builder.append(new OptimizedTrustingAppendOpcode());
  } else {
    builder.append(new OptimizedCautiousAppendOpcode());
  }
});

STATEMENTS.add('nested-block', (sexp: BaselineSyntax.NestedBlock, builder: OpcodeBuilder) => {
  BLOCKS.compile(sexp, builder);
});

let EXPRESSIONS = new Compilers<SexpExpression, CompiledExpression<Opaque>>();

import E = WireFormat.Expressions;

export function expr(expression: WireFormat.Expression, builder: OpcodeBuilder): CompiledExpression<Opaque> {
  if (Array.isArray(expression)) {
    return EXPRESSIONS.compile(expression, builder);
  } else {
    return new CompiledValue(expression);
  }
}

EXPRESSIONS.add('unknown', (sexp: E.Unknown, builder: OpcodeBuilder) => {
  let path = sexp[1];

  if (builder.env.hasHelper(path, builder.symbolTable)) {
    return new CompiledHelper(path, builder.env.lookupHelper(path, builder.symbolTable), CompiledArgs.empty(), builder.symbolTable);
  } else {
    return compileRef(path, builder);
  }
});

EXPRESSIONS.add('concat', (sexp: E.Concat, builder: OpcodeBuilder) => {
  let params = sexp[1].map(p => expr(p, builder));
  return new CompiledConcat(params);
});

EXPRESSIONS.add('helper', (sexp: E.Helper, builder: OpcodeBuilder) => {
  let { env, symbolTable } = builder;
  let [, path, params, hash] = sexp;

  if (env.hasHelper(path, symbolTable)) {
    let args = compileArgs(params, hash, builder);
    return new CompiledHelper(path, env.lookupHelper(path, symbolTable), args, symbolTable);
  } else {
    throw new Error(`Compile Error: ${path.join('.')} is not a helper`);
  }
});

EXPRESSIONS.add('get', (sexp: E.Get, builder: OpcodeBuilder) => {
  return compileRef(sexp[1], builder);
});

EXPRESSIONS.add('undefined', (sexp: E.Undefined, builder: OpcodeBuilder) => {
  return new CompiledValue(undefined);
});

function compileArgs(params: WireFormat.Core.Params, hash: WireFormat.Core.Hash, builder: OpcodeBuilder): CompiledArgs {
  let compiledParams = compileParams(params, builder);
  let compiledHash = compileHash(hash, builder);
  return CompiledArgs.create(compiledParams, compiledHash, EMPTY_BLOCKS);
}

function compileParams(params: Option<WireFormat.Core.Params>, builder: OpcodeBuilder): CompiledPositionalArgs {
  if (!params || params.length === 0) return COMPILED_EMPTY_POSITIONAL_ARGS;
  let compiled = params.map(p => expr(p, builder));
  return CompiledPositionalArgs.create(compiled);
}

function compileHash(hash: Option<WireFormat.Core.Hash>, builder: OpcodeBuilder): CompiledNamedArgs {
  if (!hash) return COMPILED_EMPTY_NAMED_ARGS;
  let [keys, values] = hash;
  if (keys.length === 0) return COMPILED_EMPTY_NAMED_ARGS;

  let compiled = values.map(p => expr(p, builder));
  return new CompiledNamedArgs(keys, compiled);
}

function compileRef(parts: string[], builder: OpcodeBuilder) {
  let head = parts[0];
  let local: Option<number>;

  if (head === null) { // {{this.foo}}
    let inner = new CompiledSelf();
    let path = parts.slice(1) as string[];
    return CompiledLookup.create(inner, path);
  } else if (local = builder.symbolTable.getSymbol('local', head)) {
    let path = parts.slice(1) as string[];
    let inner = new CompiledSymbol(local, head);
    return CompiledLookup.create(inner, path);
  } else {
    let inner = new CompiledSelf();
    return CompiledLookup.create(inner, parts as string[]);
  }
}

export type BlockCompileFunction = (sexp: BaselineSyntax.NestedBlock, builder: OpcodeBuilder) => void;

export class Blocks {
  private names = dict<number>();
  private funcs: BlockCompileFunction[] = [];

  add(name: string, func: BlockCompileFunction) {
    this.funcs.push(func);
    this.names[name] = this.funcs.length - 1;
  }

  compile(sexp: BaselineSyntax.NestedBlock, builder: OpcodeBuilder): void {
    assert(sexp[1].length === 1, 'paths in blocks are not supported');

    let name: string = sexp[1][0];
    let index = this.names[name];

    assert(index !== undefined, `${name} is not supported as a block`);

    let func = this.funcs[index];
    func(sexp, builder);
  }
}

export const BLOCKS = new Blocks();

BLOCKS.add('if', (sexp: BaselineSyntax.NestedBlock, builder: OpcodeBuilder) => {
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

  let [, path, params, hash, _default, inverse] = sexp;
  let args = compileArgs(params, hash, builder);

  builder.putArgs(args);
  builder.test('environment');

  builder.block(null, b => {
    if (_default && inverse) {
      b.jumpUnless('ELSE');
      b.evaluate('default', _default);
      b.jump('END');
      b.label('ELSE');
      b.evaluate('inverse', inverse);
    } else if (_default) {
      b.jumpUnless('END');
      b.evaluate('default', _default);
    } else {
      throw unreachable();
    }
  });
});

BLOCKS.add('unless', (sexp: BaselineSyntax.NestedBlock, builder: OpcodeBuilder) => {
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

  let [, path, params, hash, _default, inverse] = sexp;
  let args = compileArgs(params, hash, builder);

  builder.putArgs(args);
  builder.test('environment');

  builder.block(null, b => {
    if (_default && inverse) {
      b.jumpIf('ELSE');
      b.evaluate('default', _default);
      b.jump('END');
      b.label('ELSE');
      b.evaluate('inverse', inverse);
    } else if (_default) {
      b.jumpIf('END');
      b.evaluate('default', _default);
    } else {
      throw unreachable();
    }
  });
});

BLOCKS.add('with', (sexp: BaselineSyntax.NestedBlock, builder: OpcodeBuilder) => {
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

  let [, path, params, hash, _default, inverse] = sexp;
  let args = compileArgs(params, hash, builder);

  builder.putArgs(args);
  builder.test('environment');

  builder.block(null, b => {
    if (_default && inverse) {
      b.jumpUnless('ELSE');
      b.evaluate('default', _default);
      b.jump('END');
      b.label('ELSE');
      b.evaluate('inverse', inverse);
    } else if (_default) {
      b.jumpUnless('END');
      b.evaluate('default', _default);
    } else {
      throw unreachable();
    }
  });
});

BLOCKS.add('each', (sexp: BaselineSyntax.NestedBlock, builder: OpcodeBuilder) => {
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

  let [, path, params, hash, _default, inverse] = sexp;
  let args = compileArgs(params, hash, builder);

  builder.block(args, b => {
    b.putIterator();

    if (inverse) {
      b.jumpUnless('ELSE');
    } else {
      b.jumpUnless('END');
    }

    b.iter(b => {
      b.evaluate('default', unwrap(_default));
    });

    if (inverse) {
      b.jump('END');
      b.label('ELSE');
      b.evaluate('inverse', inverse);
    }
  });
});