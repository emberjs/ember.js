import type { RuntimeArtifacts } from '@glimmer/interfaces';

import { ConstantsImpl } from './constants';
import { HeapImpl } from './program';

export function artifacts(): RuntimeArtifacts {
  return {
    constants: new ConstantsImpl(),
    heap: new HeapImpl(),
  };
}
