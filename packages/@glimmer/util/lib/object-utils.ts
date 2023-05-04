export let assign = Object.assign;

export function fillNulls<T>(count: number): T[] {
  let arr = new Array(count);

  for (let i = 0; i < count; i++) {
    arr[i] = null;
  }

  return arr;
}

export function values<T>(obj: { [s: string]: T }): T[] {
  return Object.values(obj);
}

export type ObjectEntry<D extends object> = { [P in keyof D]: [P, D[P]] }[keyof D];

export function entries<D extends object>(dict: D): ObjectEntry<D>[] {
  return Object.entries(dict) as ObjectEntry<D>[];
}
