import { statementCompiler } from './syntax';
import { Statement } from "@glimmer/wire-format";
import { ParsedLayout, Compiler } from "@glimmer/interfaces";
import { OpcodeBuilderConstructor, debugSlice } from "@glimmer/opcode-compiler";
import { DEBUG } from "@glimmer/local-debug-flags";

export function compile(statements: Statement[], containingLayout: ParsedLayout, asPartial: boolean, Builder: OpcodeBuilderConstructor, compiler: Compiler): number {
  let { referrer } = containingLayout;
  let { program } = compiler;

  let builder = new Builder(compiler, referrer, containingLayout, asPartial);
  let sCompiler = statementCompiler();

  for (let i = 0; i < statements.length; i++) {
    sCompiler.compile(statements[i], builder);
  }

  let handle = builder.commit();

  if (DEBUG) {
    let { heap } = program;
    let start = heap.getaddr(handle);
    let end = start + heap.sizeof(handle);

    debugSlice(program, start, end);
  }

  return handle;
}
