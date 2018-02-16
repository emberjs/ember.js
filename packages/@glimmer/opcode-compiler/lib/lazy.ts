import { LazyOpcodeBuilder } from './opcode-builder';
import { Macros } from './syntax';
import { AbstractCompiler } from './compiler';
import { Opaque, RuntimeResolver, Compiler, CompileTimeLookup, LayoutWithContext, CompileTimeConstants } from "@glimmer/interfaces";
import { Program, LazyConstants } from "@glimmer/program";

export interface LazyCompilerOptions<TemplateMeta> {
  lookup: CompileTimeLookup<TemplateMeta>;
  resolver: RuntimeResolver<TemplateMeta>;
  program: Program<TemplateMeta>;
  macros: Macros;
}

export class LazyCompiler<TemplateMeta> extends AbstractCompiler<TemplateMeta, LazyOpcodeBuilder<TemplateMeta>> implements Compiler<LazyOpcodeBuilder<TemplateMeta>> {
  static default<TemplateMeta>({ lookup, resolver, macros }: Pick<LazyCompilerOptions<TemplateMeta>, 'lookup' | 'resolver' | 'macros'>): LazyCompiler<TemplateMeta> {
    let constants = new LazyConstants(resolver);
    let program = new Program(constants);

    let compiler = new LazyCompiler<TemplateMeta>({
      lookup,
      resolver,
      program,
      macros
    });

    return compiler;
  }

  private constructor(private options: LazyCompilerOptions<TemplateMeta>) {
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

  builderFor(containingLayout: LayoutWithContext<TemplateMeta>): LazyOpcodeBuilder<TemplateMeta> {
    return new LazyOpcodeBuilder(this, containingLayout);
  }
}
