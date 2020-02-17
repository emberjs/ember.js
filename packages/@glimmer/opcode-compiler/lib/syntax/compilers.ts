import { ContainingMetadata, SexpOpcode, SexpOpcodeMap } from '@glimmer/interfaces';
import { assert } from '@glimmer/util';

export type CompilerFunction<TSexp, TCompileActions> = (
  sexp: TSexp,
  meta: ContainingMetadata
) => TCompileActions;

export class Compilers<TSexpOpcodes extends SexpOpcode, TCompileActions> {
  private names: {
    [name: number]: number;
  } = {};

  private funcs: CompilerFunction<any, TCompileActions>[] = [];

  add<TSexpOpcode extends TSexpOpcodes>(
    name: TSexpOpcode,
    func: CompilerFunction<SexpOpcodeMap[TSexpOpcode], TCompileActions>
  ): void {
    this.names[name] = this.funcs.push(func) - 1;
  }

  compile(sexp: SexpOpcodeMap[TSexpOpcodes], meta: ContainingMetadata): TCompileActions {
    let name = sexp[0];
    let index = this.names[name];
    let func = this.funcs[index];
    assert(!!func, `expected an implementation for ${sexp[0]}`);

    return func(sexp, meta);
  }
}
