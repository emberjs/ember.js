// The `& string` here is to enforce that the propreties are strings since this is expected
// to be the case elsewhere.
export default function getAllPropertyNames<T>(Klass: { prototype: T }): Set<keyof T & string> {
  let proto = Klass.prototype;
  let properties: Set<keyof T & string> = new Set();

  while (proto !== Object.prototype) {
    // SAFETY: Using `getOwnPropertyNames` should only be returning us properties that are `keyof T`.
    // Additionally, this will only return strings, which is what we're also expecting to work with here.
    let names = Object.getOwnPropertyNames(proto) as Array<keyof T & string>;
    names.forEach((name) => properties.add(name));
    proto = Object.getPrototypeOf(proto);
  }

  return properties;
}
