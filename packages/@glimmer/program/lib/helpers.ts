import {
  WholeProgramCompilationContext,
  CompilerArtifacts,
  SyntaxCompilationContext,
} from '@glimmer/interfaces';

export function patchStdlibs(program: WholeProgramCompilationContext) {
  program.heap.patchStdlibs(program.stdlib);
}

export function programArtifacts(program: WholeProgramCompilationContext): CompilerArtifacts {
  let heap = program.heap.capture(program.stdlib);
  let constants = program.constants.toPool();

  return { heap, constants };
}

export function artifacts(syntax: SyntaxCompilationContext): CompilerArtifacts {
  return programArtifacts(syntax.program);
}
