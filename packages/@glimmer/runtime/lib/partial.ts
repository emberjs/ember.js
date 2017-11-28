import { ProgramSymbolTable } from '@glimmer/interfaces';
import { Template } from './template';

export class PartialDefinition {
  constructor(
    public name: string, // for debugging
    private template: Template
  ) {
  }

  getPartial(): { symbolTable: ProgramSymbolTable, handle: number } {
    let partial = this.template.asPartial();
    let handle = partial.compile();
    return { symbolTable: partial.symbolTable, handle };
  }
}
