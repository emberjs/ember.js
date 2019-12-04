import { CapturedArguments, VM, VMArguments } from '@glimmer/interfaces';
import { HelperRootReference } from '@glimmer/reference';

function inputTypeHelper({ positional }: CapturedArguments) {
  let type = positional.at(0).value();
  if (type === 'checkbox') {
    return '-checkbox';
  }
  return '-text-field';
}

export default function(args: VMArguments, vm: VM) {
  return new HelperRootReference(inputTypeHelper, args.capture(), vm.env);
}
