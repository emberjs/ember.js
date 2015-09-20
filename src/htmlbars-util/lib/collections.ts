export interface Dict<T> {
  [index: string]: T;
}

export interface Set<T> {
  add(value: T): Set<T>;
  delete(value: T);
  forEach(callback: (T) => void);
}