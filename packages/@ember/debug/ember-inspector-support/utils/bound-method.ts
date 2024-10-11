const ENTRIES = new WeakMap();

function entriesFor(obj: any) {
  let entries = ENTRIES.get(obj);

  if (entries === undefined) {
    entries = new WeakMap();
    ENTRIES.set(obj, entries);
  }

  return entries;
}

/**
 * Return `method.bind(obj)` or `obj[method].bind(obj)`. When called multiple
 * times, the same bound function will be returned.
 *
 * @param {Object} obj
 * @param {String|Symbol|Function} method
 * @return {Function}
 */
export default function bound(obj: any, method: string | Function) {
  let func;

  if (typeof method === 'function') {
    func = method;
  } else {
    func = obj[method];

    if (typeof func !== 'function') {
      throw new TypeError(`${obj}[${method}] is not a function (was ${func})`);
    }
  }

  let entries = entriesFor(obj);
  let bound = entries.get(func);

  if (bound === undefined) {
    bound = func.bind(obj);
    entries.set(func, bound);
  }

  return bound;
}
