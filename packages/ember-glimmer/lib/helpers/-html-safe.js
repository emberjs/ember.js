import { InternalHelperReference } from '../utils/references';
import { SafeString } from '../utils/string';

function htmlSafe({ positional }) {
  let path = positional.at(0);
  return new SafeString(path.value());
}

export default {
  isInternalHelper: true,
  toReference(args) {
    return new InternalHelperReference(htmlSafe, args);
  }
};
