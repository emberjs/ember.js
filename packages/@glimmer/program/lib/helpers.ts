import { WholeProgramCompilationContext, CompilerArtifacts } from '@glimmer/interfaces';

export function patchStdlibs(program: WholeProgramCompilationContext) {
  program.heap.patchStdlibs(program.stdlib);
}

export function artifacts(program: WholeProgramCompilationContext): CompilerArtifacts {
  let heap = program.heap.capture(program.stdlib);
  let constants = program.constants.toPool();

  return { heap, constants };
}
