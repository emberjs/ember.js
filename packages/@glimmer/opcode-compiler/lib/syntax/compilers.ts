import { BuilderOp, HighLevelOp, SexpOpcode, SexpOpcodeMap } from '@glimmer/interfaces';
import { assert } from '@glimmer/util';

export type PushExpressionOp = (...op: BuilderOp | HighLevelOp) => void;

declare const STATEMENT: unique symbol;

export type HighLevelStatementOp = [{ [STATEMENT]: undefined }];

export type PushStatementOp = (...op: BuilderOp | HighLevelOp | HighLevelStatementOp) => void;

export type CompilerFunction<PushOp extends PushExpressionOp, TSexp> = (
  op: PushOp,
  sexp: TSexp
) => void;

export class Compilers<PushOp extends PushExpressionOp, TSexpOpcodes extends SexpOpcode> {
  private names: {
    [name: number]: number;
  } = {};

  private funcs: CompilerFunction<PushOp, any>[] = [];

  add<TSexpOpcode extends TSexpOpcodes>(
    name: TSexpOpcode,
    func: CompilerFunction<PushOp, SexpOpcodeMap[TSexpOpcode]>
  ): void {
    this.names[name] = this.funcs.push(func) - 1;
  }

  compile(op: PushOp, sexp: SexpOpcodeMap[TSexpOpcodes]): void {
    let name = sexp[0];
    let index = this.names[name];
    let func = this.funcs[index];
    assert(!!func, `expected an implementation for ${sexp[0]}`);

    func(op, sexp);
  }
}
