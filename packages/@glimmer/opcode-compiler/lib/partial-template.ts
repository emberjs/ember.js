import {
  ProgramSymbolTable,
  Template,
  SyntaxCompilationContext,
  HandleResult,
  PartialDefinition,
} from '@glimmer/interfaces';
import { unwrapTemplate } from '@glimmer/util';

export class PartialDefinitionImpl implements PartialDefinition {
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
