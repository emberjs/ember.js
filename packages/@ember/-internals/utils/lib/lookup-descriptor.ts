export function findDescriptor(
  obj: object,
  keyName: string | symbol
): { object: object; descriptor: PropertyDescriptor } | null {
  let current: object | null = obj;
  do {
    let descriptor = Object.getOwnPropertyDescriptor(current, keyName);
    if (descriptor !== undefined) {
      return { descriptor, object: current };
    }
    current = Object.getPrototypeOf(current);
  } while (current !== null);
  return null;
}

export default function lookupDescriptor(
  obj: object,
  keyName: string | symbol
): PropertyDescriptor | null {
  return findDescriptor(obj, keyName)?.descriptor ?? null;
}
