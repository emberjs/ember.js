/**
 * Per-class registry of "private field readers" — functions that, given an
 * instance and a private-field name, return the field's value.
 *
 * JavaScript private fields can only be reached via the `obj.#name` syntax,
 * which is bound at parse time to the lexically-enclosing class. Glimmer's
 * path walker, by contrast, sees `{{this.#foo}}` as a generic property
 * access (`instance['#foo']`) and finds nothing. To bridge that gap we let a
 * class register a single accessor function for itself; the function is
 * constructed inside the class body (so its `#name` syntax binds to the
 * class's private slots) and is invoked by `_getProp` whenever the property
 * walker hits a `#`-prefixed key.
 *
 * Subclassing works naturally: the lookup walks the prototype chain to find
 * the closest registered reader, and JS already guarantees that a parent
 * class's reader can read its own private fields on subclass instances.
 */
export type PrivateFieldReader = (instance: object, fieldName: string) => unknown;

const PRIVATE_FIELD_READERS = new WeakMap<object, PrivateFieldReader>();

export function setPrivateFieldReader(component: object, reader: PrivateFieldReader): void {
  PRIVATE_FIELD_READERS.set(component, reader);
}

export function getPrivateFieldReader(instance: object): PrivateFieldReader | undefined {
  let cls: object | null = (instance as { constructor?: object | null }).constructor ?? null;
  while (cls !== null && cls !== Function.prototype) {
    let reader = PRIVATE_FIELD_READERS.get(cls);
    if (reader !== undefined) return reader;
    cls = Object.getPrototypeOf(cls);
  }
  return undefined;
}
