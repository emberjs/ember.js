import {
  CompilableTemplate,
  STDLib,
  ProgramSymbolTable,
  CompilableProgram,
  Option,
  ParsedLayout
} from '@glimmer/interfaces';
import { Statement, SerializedTemplateBlock } from '@glimmer/wire-format';
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

  compile(): number {
    let { compiled } = this;
    if (compiled !== null) return compiled;

    // Track that compilation has started but not yet finished by temporarily
    // using a placeholder handle. In eager compilation mode, where compile()
    // may be called recursively, we use this as a signal that the handle cannot
    // be known synchronously and must be linked lazily.
    this.compiled = PLACEHOLDER_HANDLE;

    let { statements, containingLayout, options: { compiler, asPartial } } = this;
    return (this.compiled = compiler.add(statements, containingLayout, asPartial, compiler.stdLib));
  }
}
