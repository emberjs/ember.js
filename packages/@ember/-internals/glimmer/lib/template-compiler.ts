import { Compiler } from '@glimmer/interfaces';
import RuntimeResolver from './resolver';

// factory for DI
export default {
  create(): Compiler {
    return new RuntimeResolver().compiler;
  },
};
