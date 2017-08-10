import {
  Option,
  SymbolTable,
  ProgramSymbolTable,
  Opaque
} from '@glimmer/interfaces';
import { Statement, SerializedTemplateBlock } from '@glimmer/wire-format';
import { OpcodeBuilder } from "@glimmer/opcode-compiler";
import { DEBUG } from '@glimmer/local-debug-flags';
import { debugSlice } from './debug';
import { Handle } from './interfaces';
import { CompilableTemplate as ICompilableTemplate, ParsedLayout } from './interfaces';
import { CompileOptions, compileStatement } from './syntax';

export { ICompilableTemplate };

export default class CompilableTemplate<S extends SymbolTable> implements ICompilableTemplate<S> {
  static topLevel(block: SerializedTemplateBlock, options: CompileOptions<Opaque, Opaque>): ICompilableTemplate<ProgramSymbolTable> {
    return new CompilableTemplate<ProgramSymbolTable>(
      block.statements,
      { block, meta: {} },
      options,
      { meta: {}, hasEval: block.hasEval, symbols: block.symbols }
    );
  }

  private compiled: Option<Handle> = null;

  constructor(private statements: Statement[], private containingLayout: ParsedLayout, private options: CompileOptions<Opaque, Opaque>, public symbolTable: S) {}

  compile(): Handle {
    let { compiled } = this;
    if (compiled !== null) return compiled;

    let { options, statements, containingLayout } = this;
    let { meta } = containingLayout;
    let { program, lookup, macros, asPartial, Builder } = options;

    let builder = new Builder(program, lookup, meta, macros, containingLayout, asPartial, Builder);

    for (let i = 0; i < statements.length; i++) {
      compileStatement(statements[i], builder as OpcodeBuilder);
    }

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
