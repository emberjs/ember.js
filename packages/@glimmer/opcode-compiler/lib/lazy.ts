import { LazyOpcodeBuilder } from './opcode-builder';
import { Macros } from './syntax';
import { AbstractCompiler } from './compiler';
import {
  RuntimeResolver,
  Compiler,
  CompileTimeLookup,
  LayoutWithContext,
} from '@glimmer/interfaces';
import { Program, LazyConstants } from '@glimmer/program';

export interface LazyCompilerOptions<Locator> {
  lookup: CompileTimeLookup<Locator>;
  resolver: RuntimeResolver<Locator>;
  program: Program<Locator>;
  macros: Macros;
}

export class LazyCompiler<Locator> extends AbstractCompiler<Locator, LazyOpcodeBuilder<Locator>>
  implements Compiler<LazyOpcodeBuilder<Locator>> {
  program!: Program<Locator>; // Hides property on base class

  static create<Locator>(
    lookup: CompileTimeLookup<Locator>,
    resolver: RuntimeResolver<Locator>,
    macros: Macros
  ): LazyCompiler<Locator> {
    let constants = new LazyConstants(resolver);
    let program = new Program<Locator>(constants);

    return new LazyCompiler(macros, program, lookup);
  }

  builderFor(containingLayout: LayoutWithContext<Locator>): LazyOpcodeBuilder<Locator> {
    return new LazyOpcodeBuilder(this, containingLayout);
  }
}
