import { BlockSymbolTable, CompilationMeta } from '@glimmer/interfaces';
import { Statement } from '@glimmer/wire-format';
import CompilableTemplate from './compilable-template';
import { BlockSyntax, ScannableTemplate } from './interfaces';
import { CompilationOptions } from '../internal-interfaces';

export default class RawInlineBlock implements ScannableTemplate<BlockSymbolTable> {
  constructor(
    private statements: Statement[],
    private parameters: number[],
    private meta: CompilationMeta,
    private options: CompilationOptions
  ) {
  }

  scan(): BlockSyntax {
    return new CompilableTemplate(this.statements, { parameters: this.parameters, meta: this.meta }, this.options);
  }
}
