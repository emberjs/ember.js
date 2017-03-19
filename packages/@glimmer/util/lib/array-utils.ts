import { HAS_NATIVE_WEAKMAP } from './weakmap';

const HAS_TYPED_ARRAYS = typeof Uint32Array !== 'undefined';

let A;

if (HAS_TYPED_ARRAYS) {
  A = Uint32Array;
} else {
  A = Array;
}

export default A;

export const EMPTY_ARRAY: any[] = (HAS_NATIVE_WEAKMAP ? Object.freeze([]) : []) as any;