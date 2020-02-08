import { assert } from '@ember/debug';
import { Arguments, CapturedArguments, VM } from '@glimmer/runtime';
import { InternalHelperReference } from '../utils/references';

function i({ positional }: CapturedArguments): number {
  assert('[BUG] -i takes a single string', typeof positional.at(0).value() === 'string');
  return parseInt(positional.at(0).value() as string, 10);
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(i, args.capture());
}
