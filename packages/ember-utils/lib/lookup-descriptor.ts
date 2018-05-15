export default function lookupDescriptor(obj: object, keyName: string) {
  let current: object | null = obj;
  do {
    let descriptor = Object.getOwnPropertyDescriptor(current, keyName);
    if (descriptor !== undefined) {
      return descriptor;
    }
    current = Object.getPrototypeOf(current);
  } while (current !== null);
  return null;
}
