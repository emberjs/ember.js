export default function isEqual(a: unknown, b: unknown): boolean {
  if (a && typeof (a as IsEqual).isEqual === 'function') {
    return (a as IsEqual).isEqual(b);
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  return a === b;
}

interface IsEqual {
  isEqual(val: unknown): boolean;
}
