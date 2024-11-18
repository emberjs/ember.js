import type { RuntimeArtifacts } from '@glimmer/interfaces';

import { ConstantsImpl } from './constants';
import { ProgramHeapImpl } from './program';

export function artifacts(): RuntimeArtifacts {
  return {
    constants: new ConstantsImpl(),
    heap: new ProgramHeapImpl(),
  };
}
