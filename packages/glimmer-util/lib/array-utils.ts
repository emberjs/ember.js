const HAS_TYPED_ARRAYS = typeof Uint32Array !== 'undefined';

let A;

if (HAS_TYPED_ARRAYS) {
  A = Uint32Array
} else {
  A = Array;
}

export default A;
