import { InternalHelperReference } from '../utils/references';
import { SafeString } from '../utils/string';

function htmlSafe({ positional }) {
  let path = positional.at(0);
  return new SafeString(path.value());
}

export default function(_vm, args) {
  return new InternalHelperReference(htmlSafe, args.capture());
}
