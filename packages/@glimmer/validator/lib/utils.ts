export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((
  k: infer I
) => void)
  ? I
  : never;

export const symbol =
  typeof Symbol !== 'undefined'
    ? Symbol
    : (key: string) => `__${key}${Math.floor(Math.random() * Date.now())}__` as any;
