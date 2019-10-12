import { Arguments, VM } from '@glimmer/runtime';
import { InternalHelperReference } from '../utils/references';

function parseIntHelper({ positional }: any) {
  let value = positional.at(0).value();
  return parseInt(value);
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(parseIntHelper, args.capture());
}
