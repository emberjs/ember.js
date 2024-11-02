export let assign = Object.assign;

export function values<T>(obj: { [s: string]: T }): T[] {
  return Object.values(obj);
}

export type ObjectEntry<D extends object> = { [P in keyof D]: [P, D[P]] }[keyof D];

export function entries<D extends object>(dict: D): ObjectEntry<D>[] {
  return Object.entries(dict) as ObjectEntry<D>[];
}

export function keys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}
