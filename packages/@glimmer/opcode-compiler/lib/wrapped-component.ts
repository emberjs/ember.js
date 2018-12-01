import {
  ProgramSymbolTable,
  CompilableProgram,
  LayoutWithContext,
  Compiler,
  Option,
} from '@glimmer/interfaces';

import { ComponentArgs, ComponentBuilder as IComponentBuilder } from './interfaces';

import OpcodeBuilder from './opcode-builder-interfaces';
import { ATTRS_BLOCK } from './syntax';

export class WrappedBuilder<Locator> implements CompilableProgram {
  public symbolTable: ProgramSymbolTable;
  private compiled: Option<number> = null;
  private attrsBlockNumber: number;

  constructor(
    private compiler: Compiler<OpcodeBuilder<Locator>>,
    private layout: LayoutWithContext<Locator>
  ) {
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

  compile(): number {
    if (this.compiled !== null) return this.compiled;

    let builder = this.compiler.builderFor(this.layout);

    return (this.compiled = builder.wrappedComponent(this.layout, this.attrsBlockNumber));
  }
}

export class ComponentBuilderImpl<Locator> implements IComponentBuilder {
  constructor(private builder: OpcodeBuilder<Locator>) {}

  static(handle: number, args: ComponentArgs) {
    this.builder.staticComponent(handle, args);
  }
}
