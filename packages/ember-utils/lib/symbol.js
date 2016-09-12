import { GUID_KEY } from './guid';
import intern from './intern';

export default function symbol(debugName) {
  // TODO: Investigate using platform symbols, but we do not
  // want to require non-enumerability for this API, which
  // would introduce a large cost.

  return intern(debugName + ' [id=' + GUID_KEY + Math.floor(Math.random() * new Date()) + ']');
}
