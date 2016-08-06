export type Opaque = {} | void;

export function opaque(value: Opaque): Opaque {
  return value;
}
