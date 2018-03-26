export default function getAllPropertyNames(Klass) {
  let proto = Klass.prototype;
  let properties = new Set();

  while (proto !== Object.prototype) {
    let names = Object.getOwnPropertyNames(proto);
    names.forEach(name => properties.add(name));
    proto = Object.getPrototypeOf(proto);
  }

  return properties;
}
