import type { BuilderOp, HighLevelOp, SexpOpcode, SexpOpcodeMap } from '@glimmer/interfaces';

export type PushExpressionOp = (...op: BuilderOp | HighLevelOp) => void;

declare const STATEMENT: unique symbol;

export type HighLevelStatementOp = [{ [STATEMENT]: undefined }];

export type PushStatementOp = (...op: BuilderOp | HighLevelOp | HighLevelStatementOp) => void;

export type CompilerFunction<PushOp extends PushExpressionOp, TSexp> = (
  op: PushOp,
  sexp: TSexp
) => void;

/**
 * A wire format opcode that a compiled template imports. The tuple head of a
 * statement or expression is one of these objects. `id` is the numeric
 * SexpOpcode, kept for debug output and for templates that still ship JSON.
 */
export interface SexpOp<TSexp = unknown> {
  readonly id: SexpOpcode;
  readonly compile: CompilerFunction<PushStatementOp, TSexp>;
}

export function defineStatement<T extends SexpOpcode>(
  id: T,
  compile: CompilerFunction<PushStatementOp, SexpOpcodeMap[T]>
): SexpOp<SexpOpcodeMap[T]> {
  return { id, compile };
}

export function defineExpression<T extends SexpOpcode>(
  id: T,
  compile: CompilerFunction<PushExpressionOp, SexpOpcodeMap[T]>
): SexpOp<SexpOpcodeMap[T]> {
  return { id, compile };
}

/**
 * Templates that ship a JSON block have numeric heads. `./legacy` fills this
 * table with every op. Templates that import their ops never need it.
 */
export const LEGACY_OPS: { [id: number]: SexpOp | undefined } = {};

export function headId(sexp: readonly unknown[]): SexpOpcode {
  let head = sexp[0];
  return typeof head === 'number' ? (head as SexpOpcode) : (head as SexpOp).id;
}

export function compileSexp(op: PushStatementOp, sexp: readonly unknown[]): void {
  let head = sexp[0];

  if (typeof head === 'number') {
    let found = LEGACY_OPS[head];

    if (found === undefined) {
      throw new Error(
        `No compiler for wire format opcode ${head}. A template with a JSON block must be created with the legacy template factory.`
      );
    }

    found.compile(op, sexp);
  } else {
    (head as SexpOp).compile(op, sexp);
  }
}
