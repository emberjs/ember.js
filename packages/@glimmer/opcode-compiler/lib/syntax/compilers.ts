import {
  CompileTimeResolverDelegate,
  ContainingMetadata,
  SexpOpcodeMap,
  SexpOpcodes,
  StatementCompileActions,
  WireFormat,
  ExpressionCompileActions,
  TupleSyntax,
} from '@glimmer/interfaces';
import { assert, dict } from '@glimmer/util';

export type RegisteredStatementSyntax = StatementCompilerFunction<WireFormat.Statement>;

export type RegisteredExpressionSyntax = LeafCompilerFunction<WireFormat.TupleExpression>;

// TODO: Is leaf vs. statement vs. expression the right split?
// TODO: Either way, consolidate the naming

export type RegisteredSyntax = RegisteredStatementSyntax | RegisteredExpressionSyntax;

export type LeafCompilerFunction<T extends TupleSyntax> = ((
  sexp: T,
  meta: ContainingMetadata
) => ExpressionCompileActions);

export type StatementCompilerFunction<T extends WireFormat.Statement> = ((
  sexp: T,
  meta: ContainingMetadata
) => StatementCompileActions);

export interface StatementCompilationContext {
  meta: ContainingMetadata;
  resolver: CompileTimeResolverDelegate;
}

abstract class Compilers<U extends RegisteredSyntax> {
  protected names = dict<number>();
  protected abstract funcs: U[];

  add<N extends SexpOpcodes>(name: N, func: LeafCompilerFunction<SexpOpcodeMap[N]>): void {
    this.funcs.push(func as U);
    this.names[name] = this.funcs.length - 1;
  }
}

export class StatementCompilers extends Compilers<RegisteredStatementSyntax> {
  protected funcs: RegisteredStatementSyntax[] = [];

  add<T extends SexpOpcodes>(
    name: T,
    func: StatementCompilerFunction<SexpOpcodeMap[T] & WireFormat.Statement>
  ): void {
    this.funcs.push(func);
    this.names[name] = this.funcs.length - 1;
  }

  compile(sexp: WireFormat.Statement, meta: ContainingMetadata): StatementCompileActions {
    let name: number = sexp[0];
    let index = this.names[name];
    let func = this.funcs[index];
    assert(!!func, `expected an implementation for ${sexp[0]}`);

    return func(sexp, meta);
  }
}

export type SimpleCompilerFunction<T extends TupleSyntax> = ((
  sexp: T,
  meta: ContainingMetadata
) => ExpressionCompileActions);

export const ATTRS_BLOCK = '&attrs';

export class ExpressionCompilers extends Compilers<RegisteredExpressionSyntax> {
  protected funcs: RegisteredExpressionSyntax[] = [];

  compile(sexp: WireFormat.TupleExpression, meta: ContainingMetadata): ExpressionCompileActions {
    let name: number = sexp![0];
    let index = this.names[name];
    let func = this.funcs[index];
    assert(!!func, `expected an implementation for ${sexp[0]}`);

    return func(sexp, meta);
  }
}
