import { peekMeta } from './meta';

export function isProxy(value) {
  if (typeof value === 'object' && value !== null) {
    let meta = peekMeta(value);
    return meta === undefined ? false : meta.isProxy();
  }

  return false;
}
