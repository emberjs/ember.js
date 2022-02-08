import { Mixin } from '@ember/-internals/metal';

interface Comparable {
  compare: ((a: unknown, b: unknown) => -1 | 0 | 1) | null;
}
declare const Comparable: Mixin;

export default Comparable;
