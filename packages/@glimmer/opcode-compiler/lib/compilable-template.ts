import {
  Option,
  SymbolTable,
  ProgramSymbolTable,
  VMHandle
} from '@glimmer/interfaces';
import { Statement, SerializedTemplateBlock } from '@glimmer/wire-format';
import { DEBUG } from '@glimmer/local-debug-flags';
import { debugSlice } from './debug';
import { CompilableTemplate as ICompilableTemplate, ParsedLayout } from './interfaces';
import { CompileOptions, statementCompiler, Compilers } from './syntax';

export { ICompilableTemplate };

export default class CompilableTemplate<S extends SymbolTable, Specifier> implements ICompilableTemplate<S> {
  static topLevel<Specifier>(block: SerializedTemplateBlock, options: CompileOptions<Specifier>): ICompilableTemplate<ProgramSymbolTable> {
    return new CompilableTemplate<ProgramSymbolTable, Specifier>(
      block.statements,
      { block, referrer: options.referrer },
      options,
      { referrer: options.referrer, hasEval: block.hasEval, symbols: block.symbols }
    );
  }

  private compiled: Option<VMHandle> = null;

  private statementCompiler: Compilers<Statement>;

  constructor(private statements: Statement[], private containingLayout: ParsedLayout, private options: CompileOptions<Specifier>, public symbolTable: S) {
    this.statementCompiler = statementCompiler();
  }

  compile(): VMHandle {
    let { compiled } = this;
    if (compiled !== null) return compiled;

    let { options, statements, containingLayout } = this;
    let { referrer } = containingLayout;
    let { program, lookup, macros, asPartial, Builder } = options;

    let builder = new Builder(program, lookup, referrer, macros, containingLayout, asPartial);

    for (let i = 0; i < statements.length; i++) {
      this.statementCompiler.compile(statements[i], builder);
    }

    let handle = builder.commit(program.heap, containingLayout.block.symbols.length);

    if (DEBUG) {
      let { heap } = program;
      let start = heap.getaddr(handle);
      let end = start + heap.sizeof(handle);

      debugSlice(program, start, end);
    }

    return (this.compiled = handle);
  }
}
