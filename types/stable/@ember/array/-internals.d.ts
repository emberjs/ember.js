declare module '@ember/array/-internals' {
  import type { EmberArrayLike } from '@ember/array';
  export function setEmberArray(obj: object): void;
  export function isEmberArray(obj: unknown): obj is EmberArrayLike<unknown>;
}
