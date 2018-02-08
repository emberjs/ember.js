import {
  CompilableTemplate,
  STDLib,
  ProgramSymbolTable,
  CompilableProgram,
  Option
} from '@glimmer/interfaces';
import { Statement, SerializedTemplateBlock } from '@glimmer/wire-format';
import { DEBUG } from '@glimmer/local-debug-flags';
import { debugSlice } from './debug';
import { ParsedLayout } from './interfaces';
import { CompileOptions, statementCompiler, Compilers } from './syntax';

export const PLACEHOLDER_HANDLE = -1;

export default class CompilableTemplateImpl<SymbolTable, TemplateMeta> implements CompilableTemplate<SymbolTable> {
  static topLevel<TemplateMeta>(block: SerializedTemplateBlock, options: CompileOptions<TemplateMeta>): CompilableProgram {
    return new CompilableTemplateImpl<ProgramSymbolTable, TemplateMeta>(
      block.statements,
      { block, referrer: options.referrer },
      options,
      { hasEval: block.hasEval, symbols: block.symbols }
    );
  }

  private compiled: Option<number> = null;

  private statementCompiler: Compilers<Statement>;

  constructor(private statements: Statement[], private containingLayout: ParsedLayout, private options: CompileOptions<TemplateMeta>, public symbolTable: SymbolTable) {
    this.statementCompiler = statementCompiler();
  }

  compile(stdLib?: STDLib): number {
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

    let builder = new Builder(program, resolver, referrer, macros, containingLayout, asPartial, stdLib);

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
