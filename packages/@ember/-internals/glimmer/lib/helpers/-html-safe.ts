import { Arguments, VM } from '@glimmer/runtime';
import { InternalHelperReference } from '../utils/references';
import { SafeString } from '../utils/string';

function htmlSafe({ positional }: any) {
  let path = positional.at(0);
  return new SafeString(path.value());
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(htmlSafe, args.capture());
}
