import {
  Option,
  SymbolTable
} from '@glimmer/interfaces';
import { Statement } from '@glimmer/wire-format';
import { Handle, Program } from '../environment';
import { debugSlice } from '../opcodes';
import { compileStatements } from './functions';
import { DEBUG } from '@glimmer/local-debug-flags';
import { CompilableTemplate as ICompilableTemplate } from './interfaces';
import { CompilationOptions } from '../internal-interfaces';

export { ICompilableTemplate };

export default class CompilableTemplate<S extends SymbolTable> implements ICompilableTemplate<S> {
  private compiled: Option<Handle> = null;

  constructor(public statements: Statement[], public symbolTable: S, private program: Program) {}

  compile(): Handle {
    let { compiled } = this;
    if (compiled !== null) return compiled;

    let { program } = this;

    let builder = compileStatements(this.statements, this.symbolTable.meta, program);
    let handle = builder.commit(program.heap);

    if (DEBUG) {
      let { heap } = program;
      let start = heap.getaddr(handle);
      let end = start + heap.sizeof(handle);
      debugSlice(program, start, end);
    }

    return (this.compiled = handle);
  }
}
