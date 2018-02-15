import { LazyOpcodeBuilder } from './opcode-builder';
import { Macros, statementCompiler } from './syntax';
import { Opaque, RuntimeResolver, Maybe, STDLib, Compiler, CompileTimeLookup, Option, ParsedLayout, CompileTimeConstants } from "@glimmer/interfaces";
import { Program, LazyConstants } from "@glimmer/program";
import { Statement } from "@glimmer/wire-format";
import { DEBUG } from "@glimmer/local-debug-flags";
import { debugSlice } from "@glimmer/opcode-compiler";

export interface LazyCompilerOptions {
  lookup: CompileTimeLookup<Opaque>;
  resolver: RuntimeResolver<Opaque>;
  program: Program<Opaque>;
  macros: Macros;
  builder: typeof LazyOpcodeBuilder;
}

export class LazyCompiler implements Compiler {
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

  private statementCompiler = statementCompiler();

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

  add(statements: Statement[], containingLayout: ParsedLayout, asPartial: boolean): number {
    let { referrer } = containingLayout;
    let { builder: Builder, program } = this.options;
    // let { program, resolver, macros, asPartial, Builder } = compiler;

    let builder = new Builder(this, referrer, containingLayout, asPartial);

    for (let i = 0; i < statements.length; i++) {
      this.statementCompiler.compile(statements[i], builder);
    }

    let handle = builder.commit(program.heap, containingLayout.block.symbols.length);

    if (DEBUG) {
      let { heap } = program;
      let start = heap.getaddr(handle);
      let end = start + heap.sizeof(handle);

      debugSlice(program, start, end);
    }

    return handle;
  }
}
