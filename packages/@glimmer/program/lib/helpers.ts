import {
  CompileTimeCompilationContext,
  CompileTimeArtifacts,
  RuntimeArtifacts,
} from '@glimmer/interfaces';
import { ConstantsImpl } from './constants';
import { HeapImpl } from './program';

export function patchStdlibs(program: CompileTimeCompilationContext) {
  program.heap.patchStdlibs(program.stdlib);
}

export function artifacts(): CompileTimeArtifacts & RuntimeArtifacts {
  return {
    constants: new ConstantsImpl(),
    heap: new HeapImpl(),
  };
}
