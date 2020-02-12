import { assert } from '@ember/debug';
import { CapturedArguments, VM, VMArguments } from '@glimmer/interfaces';
import { HelperRootReference } from '@glimmer/reference';

function i({ positional }: CapturedArguments): number {
  assert('[BUG] -i takes a single string', typeof positional.at(0).value() === 'string');
  return parseInt(positional.at(0).value() as string, 10);
}

export default function(args: VMArguments, vm: VM) {
  return new HelperRootReference(i, args.capture(), vm.env);
}
