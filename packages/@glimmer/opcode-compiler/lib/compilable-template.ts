import {
  Option,
  SymbolTable,
  ProgramSymbolTable
} from '@glimmer/interfaces';
import { Statement, SerializedTemplateBlock } from '@glimmer/wire-format';
import { DEBUG } from '@glimmer/local-debug-flags';
import { debugSlice } from './debug';
import { VMHandle } from './interfaces';
import { CompilableTemplate as ICompilableTemplate, ParsedLayout } from './interfaces';
import { CompileOptions, compileStatement } from './syntax';

export { ICompilableTemplate };

export default class CompilableTemplate<S extends SymbolTable, Specifier> implements ICompilableTemplate<S> {
  static topLevel<Specifier>(block: SerializedTemplateBlock, options: CompileOptions<Specifier>): ICompilableTemplate<ProgramSymbolTable> {
    return new CompilableTemplate<ProgramSymbolTable, Specifier>(
      block.statements,
      { block, referer: options.referer },
      options,
      { referer: options.referer, hasEval: block.hasEval, symbols: block.symbols }
    );
  }

  private compiled: Option<VMHandle> = null;

  constructor(private statements: Statement[], private containingLayout: ParsedLayout, private options: CompileOptions<Specifier>, public symbolTable: S) {}

  compile(): VMHandle {
    let { compiled } = this;
    if (compiled !== null) return compiled;

    let { options, statements, containingLayout } = this;
    let { referer } = containingLayout;
    let { program, lookup, macros, asPartial, Builder } = options;

    let builder = new Builder(program, lookup, referer, macros, containingLayout, asPartial);

    for (let i = 0; i < statements.length; i++) {
      compileStatement(statements[i], builder);
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
