import { Mixin } from '@ember/-internals/metal';
import Enumerable from './enumerable';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MutableEnumerable extends Enumerable {}
declare const MutableEnumerable: Mixin;

export default MutableEnumerable;
