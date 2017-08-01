import { CompilationMeta } from '@glimmer/interfaces';
import * as WireFormat from '@glimmer/wire-format';
import CompilableTemplate from './syntax/compilable-template';
import {
  TopLevelSyntax,
} from './syntax/interfaces';
import { CompilationOptions } from './internal-interfaces';

export type DeserializedStatement = WireFormat.Statement | WireFormat.Statements.Attribute | WireFormat.Statements.Argument;

export default class Scanner {
  constructor(private block: WireFormat.SerializedTemplateBlock, private options: CompilationOptions) {
  }

  scanLayout(meta: CompilationMeta): TopLevelSyntax {
    let { block, options } = this;
    let { symbols, hasEval } = block;

    return new CompilableTemplate(block.statements, { meta, hasEval, symbols }, options);
  }
}
