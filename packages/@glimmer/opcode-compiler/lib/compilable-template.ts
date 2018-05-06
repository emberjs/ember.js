import {
  CompilableTemplate,
  ProgramSymbolTable,
  CompilableProgram as ICompilableProgram,
  Option,
  LayoutWithContext,
  Opaque,
  Compiler,
  BlockSymbolTable,
  BlockWithContext,
} from '@glimmer/interfaces';

export const PLACEHOLDER_HANDLE = -1;

export class CompilableProgram implements ICompilableProgram {
  private compiled: Option<number> = null;

  constructor(protected compiler: Compiler<Opaque>, protected layout: LayoutWithContext) {}

  get symbolTable(): ProgramSymbolTable {
    return this.layout.block;
  }

  compile(): number {
    if (this.compiled !== null) return this.compiled;

    this.compiled = PLACEHOLDER_HANDLE;

    let {
      block: { statements },
    } = this.layout;

    return (this.compiled = this.compiler.add(statements, this.layout));
  }
}

export class CompilableBlock implements CompilableTemplate<BlockSymbolTable> {
  private compiled: Option<number> = null;

  constructor(private compiler: Compiler<Opaque>, private parsed: BlockWithContext) {}

  get symbolTable(): BlockSymbolTable {
    return this.parsed.block;
  }

  compile(): number {
    if (this.compiled !== null) return this.compiled;

    // Track that compilation has started but not yet finished by temporarily
    // using a placeholder handle. In eager compilation mode, where compile()
    // may be called recursively, we use this as a signal that the handle cannot
    // be known synchronously and must be linked lazily.
    this.compiled = PLACEHOLDER_HANDLE;

    let {
      block: { statements },
      containingLayout,
    } = this.parsed;

    return (this.compiled = this.compiler.add(statements, containingLayout));
  }
}
