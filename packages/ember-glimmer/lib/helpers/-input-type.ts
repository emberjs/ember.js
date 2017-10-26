import { InternalHelperReference } from '../utils/references';

function inputTypeHelper({ positional }) {
  let type = positional.at(0).value();
  if (type === 'checkbox') {
    return '-checkbox';
  }
  return '-text-field';
}

export default function(_vm, args) {
  return new InternalHelperReference(inputTypeHelper, args.capture());
}
