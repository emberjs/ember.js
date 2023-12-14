declare module '@ember/-internals/glimmer/lib/syntax/utils' {
  import type { Core } from '@glimmer/interfaces';
  import type { Nullable } from '@ember/-internals/utility-types';
  export function hashToArgs(hash: Nullable<Core.Hash>): Nullable<Core.Hash>;
}
