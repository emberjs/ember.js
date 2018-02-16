import { statementCompiler } from './syntax';
import { debug, AnyAbstractCompiler } from './compiler';
import { OpcodeBuilder } from './opcode-builder';
import { Statement } from "@glimmer/wire-format";
import { Compiler, Recast } from "@glimmer/interfaces";
import { DEBUG } from "@glimmer/local-debug-flags";

export function compile<TemplateMeta>(statements: Statement[], builder: OpcodeBuilder<TemplateMeta>, compiler: Compiler<OpcodeBuilder<TemplateMeta>>): number {
  let sCompiler = statementCompiler();

  for (let i = 0; i < statements.length; i++) {
    sCompiler.compile(statements[i], builder);
  }

  let handle = builder.commit();

  if (DEBUG) {
    debug(compiler as Recast<Compiler<OpcodeBuilder<TemplateMeta>>, AnyAbstractCompiler>, handle);
  }

  return handle;
}
