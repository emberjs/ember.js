import { DEPRECATIONS, deprecateUntil } from '@ember/-internals/deprecations';
import doNotUseThis from './barrel';

export default new Proxy(doNotUseThis, {
  get(target, key, receiver) {
    // We don't have symbol exports, so this is probably fine.
    if (typeof key === 'string') {
      deprecateUntil(
        `importing ${key} from the 'ember' barrel file is deprecated.`,
        DEPRECATIONS.DEPRECATE_IMPORT_EMBER(key)
      );
    }

    return Reflect.get(target, key, receiver);
  },
  getOwnPropertyDescriptor(target, key) {
    if (typeof key === 'string') {
      deprecateUntil(
        `importing ${key} from the 'ember' barrel file is deprecated.`,
        DEPRECATIONS.DEPRECATE_IMPORT_EMBER(key)
      );
    }

    return Object.getOwnPropertyDescriptor(target, key);
  },
}) as typeof doNotUseThis;
