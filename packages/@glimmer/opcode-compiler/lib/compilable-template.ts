import {
  Option,
  SymbolTable,
  ProgramSymbolTable,
  VMHandle,
  Recast
} from '@glimmer/interfaces';
import { Statement, SerializedTemplateBlock } from '@glimmer/wire-format';
import { DEBUG } from '@glimmer/local-debug-flags';
import { debugSlice } from './debug';
import { CompilableTemplate as ICompilableTemplate, ParsedLayout } from './interfaces';
import { CompileOptions, statementCompiler, Compilers } from './syntax';

export { ICompilableTemplate };

export const PLACEHOLDER_HANDLE: VMHandle = -1 as Recast<number, VMHandle>;

export default class CompilableTemplate<S extends SymbolTable, TemplateMeta> implements ICompilableTemplate<S> {
  static topLevel<TemplateMeta>(block: SerializedTemplateBlock, options: CompileOptions<TemplateMeta>): ICompilableTemplate<ProgramSymbolTable> {
    return new CompilableTemplate<ProgramSymbolTable, TemplateMeta>(
      block.statements,
      { block, referrer: options.referrer },
      options,
      { referrer: options.referrer, hasEval: block.hasEval, symbols: block.symbols }
    );
  }

  private compiled: Option<VMHandle> = null;

  private statementCompiler: Compilers<Statement>;

  constructor(private statements: Statement[], private containingLayout: ParsedLayout, private options: CompileOptions<TemplateMeta>, public symbolTable: S) {
    this.statementCompiler = statementCompiler();
  }

  compile(): VMHandle {
    let { compiled } = this;
    if (compiled !== null) return compiled;

    // Track that compilation has started but not yet finished by temporarily
    // using a placeholder handle. In eager compilation mode, where compile()
    // may be called recursively, we use this as a signal that the handle cannot
    // be known synchronously and must be linked lazily.
    this.compiled = PLACEHOLDER_HANDLE;

    let { options, statements, containingLayout } = this;
    let { referrer } = containingLayout;
    let { program, resolver, macros, asPartial, Builder } = options;

    let builder = new Builder(program, resolver, referrer, macros, containingLayout, asPartial);

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
