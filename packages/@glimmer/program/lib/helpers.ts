import { CompileTimeArtifacts, RuntimeArtifacts } from '@glimmer/interfaces';
import { ConstantsImpl } from './constants';
import { HeapImpl } from './program';

export function artifacts(): CompileTimeArtifacts & RuntimeArtifacts {
  return {
    constants: new ConstantsImpl(),
    heap: new HeapImpl(),
  };
}
