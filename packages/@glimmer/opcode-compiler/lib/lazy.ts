import { LazyOpcodeBuilder } from './opcode-builder';
import { Macros } from './syntax';
import { AbstractCompiler } from './compiler';
import { Opaque, RuntimeResolver, Compiler, CompileTimeLookup, LayoutWithContext, CompileTimeConstants } from "@glimmer/interfaces";
import { Program, LazyConstants } from "@glimmer/program";

export interface LazyCompilerOptions<Locator> {
  lookup: CompileTimeLookup<Locator>;
  resolver: RuntimeResolver<Locator>;
  program: Program<Locator>;
  macros: Macros;
}

export class LazyCompiler<Locator> extends AbstractCompiler<Locator, LazyOpcodeBuilder<Locator>> implements Compiler<LazyOpcodeBuilder<Locator>> {
  static default<Locator>({ lookup, resolver, macros }: Pick<LazyCompilerOptions<Locator>, 'lookup' | 'resolver' | 'macros'>): LazyCompiler<Locator> {
    let constants = new LazyConstants(resolver);
    let program = new Program(constants);

    let compiler = new LazyCompiler<Locator>({
      lookup,
      resolver,
      program,
      macros
    });

    return compiler;
  }

  private constructor(private options: LazyCompilerOptions<Locator>) {
    super();
  }

  protected get macros(): Macros {
    return this.options.macros;
  }

  get program(): Program<Opaque> {
    return this.options.program;
  }

  get constants(): CompileTimeConstants {
    return this.options.program.constants;
  }

  get resolver(): CompileTimeLookup<Opaque> {
    return this.options.lookup;
  }

  get stdLib(): null {
    return null;
  }

  builderFor(containingLayout: LayoutWithContext<Locator>): LazyOpcodeBuilder<Locator> {
    return new LazyOpcodeBuilder(this, containingLayout);
  }
}
