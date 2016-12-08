export default function lookupDescriptor(obj, keyName) {
  let current = obj;
  while (current) {
    let descriptor = Object.getOwnPropertyDescriptor(current, keyName);

    if (descriptor) {
      return descriptor;
    }

    current = Object.getPrototypeOf(current);
  }

  return null;
}
