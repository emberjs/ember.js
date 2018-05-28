import { statementCompiler } from './syntax';
import { debugCompiler, AnyAbstractCompiler } from './compiler';
import { OpcodeBuilder } from './opcode-builder';
import { Statement } from '@glimmer/wire-format';
import { Compiler, Recast } from '@glimmer/interfaces';
import { DEBUG } from '@glimmer/local-debug-flags';

export function compile<Locator>(
  statements: Statement[],
  builder: OpcodeBuilder<Locator>,
  compiler: Compiler<OpcodeBuilder<Locator>>
): number {
  let sCompiler = statementCompiler();

  for (let i = 0; i < statements.length; i++) {
    sCompiler.compile(statements[i], builder);
  }

  let handle = builder.commit();

  if (DEBUG) {
    debugCompiler(
      compiler as Recast<Compiler<OpcodeBuilder<Locator>>, AnyAbstractCompiler>,
      handle
    );
  }

  return handle;
}
