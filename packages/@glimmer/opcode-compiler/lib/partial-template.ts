import { ProgramSymbolTable, Template, SyntaxCompilationContext } from '@glimmer/interfaces';

export class PartialDefinition {
  constructor(
    public name: string, // for debugging
    private template: Template
  ) {}

  getPartial(
    context: SyntaxCompilationContext
  ): { symbolTable: ProgramSymbolTable; handle: number } {
    let partial = this.template.asPartial();
    let handle = partial.compile(context);
    return { symbolTable: partial.symbolTable, handle };
  }
}
