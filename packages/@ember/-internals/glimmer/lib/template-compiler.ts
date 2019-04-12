import { Compiler } from '@glimmer/interfaces';
import RuntimeResolver from './resolver';
import { getOwner } from '@ember/-internals/owner';

// factory for DI
export default {
  create(props: any): Compiler {
    let owner = getOwner(props);

    return new RuntimeResolver(owner).compiler;
  },
};
