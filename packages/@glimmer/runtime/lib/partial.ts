import { TemplateMeta } from '@glimmer/wire-format';
import { ProgramSymbolTable } from '@glimmer/interfaces';
import { Handle } from '@glimmer/opcode-compiler';
import { Template } from './template';

export class PartialDefinition<T extends TemplateMeta = TemplateMeta> {
  constructor(
    public name: string, // for debugging
    private template: Template<T>
  ) {
  }

  getPartial(): { symbolTable: ProgramSymbolTable, handle: Handle } {
    let partial = this.template.asPartial();
    let handle = partial.compile();
    return { symbolTable: partial.symbolTable, handle };
  }
}
