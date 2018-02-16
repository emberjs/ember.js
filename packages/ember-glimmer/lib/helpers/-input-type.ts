import { Arguments, VM } from '@glimmer/runtime';
import { InternalHelperReference } from '../utils/references';

function inputTypeHelper({ positional }: any) {
  let type = positional.at(0).value();
  if (type === 'checkbox') {
    return '-checkbox';
  }
  return '-text-field';
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(inputTypeHelper, args.capture());
}
