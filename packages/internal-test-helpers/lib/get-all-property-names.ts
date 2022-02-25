export default function getAllPropertyNames(Klass: Function) {
  let proto = Klass.prototype;
  let properties: Set<string> = new Set();

  while (proto !== Object.prototype) {
    let names = Object.getOwnPropertyNames(proto);
    names.forEach((name) => properties.add(name));
    proto = Object.getPrototypeOf(proto);
  }

  return properties;
}
