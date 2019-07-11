import {
  ProgramSymbolTable,
  Template,
  SyntaxCompilationContext,
  HandleResult,
} from '@glimmer/interfaces';
import { unwrapTemplate } from './template';

export class PartialDefinition {
  constructor(
    public name: string, // for debugging
    private template: Template
  ) {}

  getPartial(
    context: SyntaxCompilationContext
  ): { symbolTable: ProgramSymbolTable; handle: HandleResult } {
    let partial = unwrapTemplate(this.template).asPartial();
    let handle = partial.compile(context);

    return { symbolTable: partial.symbolTable, handle };
  }
}
