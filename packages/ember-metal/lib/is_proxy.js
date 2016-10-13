import { peekMeta } from './meta';

export function isProxy(value) {
  if (typeof value === 'object' && value) {
    let meta = peekMeta(value);
    return meta && meta.isProxy();
  }

  return false;
}
