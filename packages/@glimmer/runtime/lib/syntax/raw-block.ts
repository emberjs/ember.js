import { BlockSymbolTable, CompilationMeta } from '@glimmer/interfaces';
import { Statement } from '@glimmer/wire-format';
import CompilableTemplate from './compilable-template';
import { Block, ScannableTemplate } from './interfaces';

export default class RawInlineBlock implements ScannableTemplate<BlockSymbolTable> {
  constructor(
    private meta: CompilationMeta,
    private statements: Statement[],
    private parameters: number[]) {
  }

  scan(): Block {
    return new CompilableTemplate(this.statements, { parameters: this.parameters, meta: this.meta });
  }
}
