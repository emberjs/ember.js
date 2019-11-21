import { VMArguments } from '@glimmer/interfaces';
import { InternalHelperReference } from '../utils/references';

function inputTypeHelper({ positional }: any) {
  let type = positional.at(0).value();
  if (type === 'checkbox') {
    return '-checkbox';
  }
  return '-text-field';
}

export default function(args: VMArguments) {
  return new InternalHelperReference(inputTypeHelper, args.capture());
}
