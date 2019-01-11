import { Helper, ResolvedValue, VMArguments } from '@glimmer/interfaces';
import { map } from '@glimmer/reference';
import { SimpleComponentManager } from '@glimmer/runtime';

export const RUNTIME_RESOLVER = {
  resolve<U extends ResolvedValue>(handle: number): U {
    if (handle >= TABLE.length) {
      throw new Error(`Unexpected handle ${handle}`);
    } else {
      return TABLE[handle] as U;
    }
  },
};

const increment: Helper = (args: VMArguments) => {
  return map(args.positional.at(0), (i: number) => i + 1);
};

const TEMPLATE_ONLY_COMPONENT = { state: null, manager: new SimpleComponentManager() };
const TABLE: ResolvedValue[] = [increment, TEMPLATE_ONLY_COMPONENT];
