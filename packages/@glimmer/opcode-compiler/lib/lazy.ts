import { LazyOpcodeBuilder, EagerOpcodeBuilder, OpcodeBuilderConstructor } from './opcode-builder';
import { Macros } from './syntax';
import { compile } from './compile';
import { Opaque, RuntimeResolver, Compiler, CompileTimeLookup, Option, ParsedLayout, CompileTimeConstants, CompilableBlock } from "@glimmer/interfaces";
import { Program, LazyConstants } from "@glimmer/program";
import { Statement, Statements, Core, Expression } from "@glimmer/wire-format";

export interface LazyCompilerOptions {
  lookup: CompileTimeLookup<Opaque>;
  resolver: RuntimeResolver<Opaque>;
  program: Program<Opaque>;
  macros: Macros;
  builder: typeof LazyOpcodeBuilder;
}

export class LazyCompiler implements Compiler<LazyOpcodeBuilder<Opaque>> {
  static default({ lookup, resolver, macros }: Pick<LazyCompilerOptions, 'lookup' | 'resolver' | 'macros'>) {
    let constants = new LazyConstants(resolver);
    let program = new Program(constants);
    let builder = LazyOpcodeBuilder;

    let compiler = new LazyCompiler({
      lookup,
      resolver,
      program,
      macros,
      builder
    });

    compiler.initialize();

    return compiler;
  }

  private constructor(private options: LazyCompilerOptions) {}

  private initialize() {
  }

  get program(): Program<Opaque> {
    return this.options.program;
  }

  get constants(): CompileTimeConstants {
    return this.program.constants;
  }

  get resolver(): CompileTimeLookup<Opaque> {
    return this.options.lookup;
  }

  get stdLib(): null {
    return null;
  }

  builderFor(referrer: Opaque, containingLayout: ParsedLayout, asPartial: boolean): LazyOpcodeBuilder<Opaque> {
    return new LazyOpcodeBuilder(this, referrer, containingLayout, asPartial);
  }

  add(statements: Statement[], containingLayout: ParsedLayout, asPartial: boolean): number {
    return compile(statements, containingLayout, asPartial, this.options.builder as OpcodeBuilderConstructor, this);
  }

  // FIXME: Don't Copy Pasta
  compileInline(sexp: Statements.Append, builder: EagerOpcodeBuilder<Opaque>): ['expr', Expression] | true {
    let { inlines } = this.options.macros;
    return inlines.compile(sexp, builder);
  }

  compileBlock(name: string, params: Core.Params, hash: Core.Hash, template: Option<CompilableBlock>, inverse: Option<CompilableBlock>, builder: EagerOpcodeBuilder<Opaque>): void {
    let { blocks } = this.options.macros;
    blocks.compile(name, params, hash, template, inverse, builder);
  }

}
