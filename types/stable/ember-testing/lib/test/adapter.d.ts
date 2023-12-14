declare module 'ember-testing/lib/test/adapter' {
  import type Adapter from 'ember-testing/lib/adapters/adapter';
  export function getAdapter(): Adapter;
  export function setAdapter(value: Adapter): void;
  export function asyncStart(): void;
  export function asyncEnd(): void;
}
