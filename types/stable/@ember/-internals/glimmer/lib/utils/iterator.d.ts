declare module '@ember/-internals/glimmer/lib/utils/iterator' {
  import type { Nullable } from '@ember/-internals/utility-types';
  import type { IteratorDelegate } from '@glimmer/reference';
  export default function toIterator(iterable: unknown): Nullable<IteratorDelegate>;
}
