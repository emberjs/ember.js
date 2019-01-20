import {
  ProgramSymbolTable,
  CompilableProgram,
  LayoutWithContext,
  Option,
  SyntaxCompilationContext,
} from '@glimmer/interfaces';

import { templateCompilationContext } from './opcode-builder/context';
import { meta } from './opcode-builder/helpers/shared';
import { wrappedComponent } from './opcode-builder/helpers/components';
import { DEBUG } from '@glimmer/local-debug-flags';
import { debugCompiler } from './compiler';
import { ATTRS_BLOCK } from './syntax/compilers';
import { concatStatements } from './syntax/concat';
import { patchStdlibs } from '@glimmer/program';

export class WrappedBuilder implements CompilableProgram {
  public symbolTable: ProgramSymbolTable;
  private compiled: Option<number> = null;
  private attrsBlockNumber: number;

  constructor(private layout: LayoutWithContext<unknown>) {
    let { block } = layout;

    let symbols = block.symbols.slice();

    // ensure ATTRS_BLOCK is always included (only once) in the list of symbols
    let attrsBlockIndex = symbols.indexOf(ATTRS_BLOCK);
    if (attrsBlockIndex === -1) {
      this.attrsBlockNumber = symbols.push(ATTRS_BLOCK);
    } else {
      this.attrsBlockNumber = attrsBlockIndex + 1;
    }

    this.symbolTable = {
      hasEval: block.hasEval,
      symbols,
    };
  }

  compile(syntax: SyntaxCompilationContext): number {
    if (this.compiled !== null) return this.compiled;

    let m = meta(this.layout);
    let context = templateCompilationContext(syntax, m);

    let actions = wrappedComponent(this.layout, this.attrsBlockNumber);

    concatStatements(context, actions);

    let handle = (this.compiled = context.encoder.commit(context.syntax.program.heap, m.size));

    if (DEBUG) {
      debugCompiler(context, handle);
    }

    patchStdlibs(context.syntax.program);
    return handle;
  }
}
