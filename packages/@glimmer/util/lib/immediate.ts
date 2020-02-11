import { exhausted } from './platform-utils';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';

let checkInt: undefined | ((num: number, min?: number, max?: number) => void);

if (LOCAL_DEBUG) {
  // eslint-disable-next-line no-var,vars-on-top
  checkInt = (num: number, min = -2147483648, max = 2147483647) => {
    if (!isInt(num, min, max)) {
      throw new Error(`expected ${num} to be an integer between ${min} to ${max}`);
    }
  };
}

/*
Encoding notes

first
2 bits    start        end
0 1       1073741824   2147483647   direct negative or boolean or null or undefined
0 0       0            1073741823   direct positive
1 1       -1           -1073741824  string index
1 0       -1073741825  -2147483648  number index

Since first bit is the sign bit then

encoded >= 0  is all directly encoded values
encoded < 0  is all indirect encoded values (encoded indexes)

For directly encoded values
encoded      decoded
0            0
...          ...
1073741823   1073741823
1073741824   false
1073741825   true
1073741826   null
1073741827   undefined
1073741828   -1
...          ...
2147483647   -1073741820

for stack handles
we map js index 0 to 2147483647 onto -1 to -2147483648

for constant handles
we map string index 0 to 1073741823 onto -1 to -1073741824
we map number index 0 to 1073741823 onto -1073741825 to -2147483648
*/

/**
 * Immediates use the positive half of 32 bits 0 through 2147483647 (0x7fffffff)
 * leaving the negative half for handles -1 through -2147483648.
 */
export const enum ImmediateConstants {
  /**
   * 31 bits can encode 2^31 values
   */
  IMMEDIATE_LENGTH = 2 ** 31,

  /**
   * Min encoded immediate is min positive
   */
  MIN_IMMEDIATE = 0,

  /**
   * Max encoded immediate is the max positive 32 bit signed int
   */
  MAX_IMMEDIATE = IMMEDIATE_LENGTH - 1,

  /**
   * The encoding of false.
   * False is the start of the second half of 31 bits
   */
  FALSE = IMMEDIATE_LENGTH / 2,

  /**
   * The maximum int that can be directly encoded vs a handle.
   *
   * The last positive int is just before FALSE.
   */
  MAX_INT = FALSE - 1,

  /**
   * The encoding of true
   */
  TRUE = FALSE + 1,

  /**
   * The encoding of null
   */
  NULL = TRUE + 1,

  /**
   * The encoding of undefined
   */
  UNDEFINED = NULL + 1,

  /**
   * Encoded -1
   *
   * Encoded just after UNDEFINED
   */
  NEGATIVE_ONE = UNDEFINED + 1,

  /**
   * The base to substract a negative from to decode or encode it.
   *
   * NEGATIVE_ONE      == NEGATIVE_BASE - -1             == encodeImmediate(-1)
   * MAX_IMMEDIATE     == NEGATIVE_BASE - MIN_INT        == encodeImmediate(MIN_INT)
   * -1                == NEGATIVE_BASE - NEGATIVE_ONE   == decodeImmediate(NEGATIVE_ONE)
   * MIN_INT           == NEGATIVE_BASE - MAX_IMMEDIATE  == decodeImmediate(MAX_IMMEDIATE)
   */
  NEGATIVE_BASE = NEGATIVE_ONE - 1,

  /**
   * The minimum int that can be directly encoded vs a handle.
   */
  MIN_INT = NEGATIVE_BASE - MAX_IMMEDIATE,
}

/**
 * The compiler constants divide the handles into two halves strings and numbers
 * while on the stack, there is only one array of js values.
 */
export const enum HandleConstants {
  HANDLE_LENGTH = 2 ** 31,
  MAX_INDEX = HANDLE_LENGTH - 1,
  MAX_HANDLE = -1,
  MIN_HANDLE = -1 - MAX_INDEX,
  STRING_HANDLE_LENGTH = HANDLE_LENGTH / 2,
  NUMBER_HANDLE_LENGTH = HANDLE_LENGTH - STRING_HANDLE_LENGTH,
  STRING_MAX_INDEX = STRING_HANDLE_LENGTH - 1,
  NUMBER_MAX_INDEX = NUMBER_HANDLE_LENGTH - 1,
  STRING_MAX_HANDLE = MAX_HANDLE,
  STRING_MIN_HANDLE = STRING_MAX_HANDLE - STRING_MAX_INDEX,
  NUMBER_MAX_HANDLE = STRING_MIN_HANDLE - 1,
  NUMBER_MIN_HANDLE = NUMBER_MAX_HANDLE - NUMBER_MAX_INDEX,
}

/**
 * Encodes a value that can be stored directly instead of being a handle.
 *
 * Immediates use the positive half of 32bits
 *
 * @param value - the value to be encoded.
 */
export function encodeImmediate(value: null | undefined | boolean | number) {
  if (typeof value === 'number') {
    if (LOCAL_DEBUG) {
      checkInt!(value, ImmediateConstants.MIN_INT, ImmediateConstants.MAX_INT);
    }
    // map -1 to -1073741820 onto 1073741828 to 2147483647
    // 1073741827 - (-1) == 1073741828
    // 1073741827 - (-1073741820) == 2147483647
    // positive it stays as is
    // 0 - 1073741823
    return value < 0 ? ImmediateConstants.NEGATIVE_BASE - value : value;
  }
  if (value === false) {
    return ImmediateConstants.FALSE;
  }
  if (value === true) {
    return ImmediateConstants.TRUE;
  }
  if (value === null) {
    return ImmediateConstants.NULL;
  }
  if (value === undefined) {
    return ImmediateConstants.UNDEFINED;
  }
  return exhausted(value);
}

/**
 * Decodes an immediate into its value.
 *
 * @param value - the encoded immediate value
 */
export function decodeImmediate(value: number): null | undefined | boolean | number {
  if (LOCAL_DEBUG) {
    // expected value to be checked before this
    checkInt!(value, ImmediateConstants.MIN_IMMEDIATE, ImmediateConstants.MAX_IMMEDIATE);
  }
  if (value > ImmediateConstants.MAX_INT) {
    switch (value) {
      case ImmediateConstants.FALSE:
        return false;
      case ImmediateConstants.TRUE:
        return true;
      case ImmediateConstants.NULL:
        return null;
      case ImmediateConstants.UNDEFINED:
        return undefined;
      default:
        // map 1073741828 to 2147483647 to -1 to -1073741820
        // 1073741827 - 1073741828 == -1
        // 1073741827 - 2147483647 == -1073741820
        return ImmediateConstants.NEGATIVE_BASE - value;
    }
  }
  return value;
}

/**
 * True if the number can be stored directly or false if it needs a handle.
 *
 * This is used on any number type to see if it can be directly encoded.
 */
export function isSmallInt(num: number) {
  return isInt(num, ImmediateConstants.MIN_INT, ImmediateConstants.MAX_INT);
}

/**
 * True if the encoded int32 operand or encoded stack int32 is a handle.
 */
export function isHandle(encoded: number) {
  if (LOCAL_DEBUG) {
    // we expect to only use this method when we already know it is an int32
    // because it was encoded or read from the Int32Array buffer
    checkInt!(encoded);
  }
  return encoded < 0;
}

/**
 * Encodes an index to an operand or stack handle.
 */
export function encodeHandle(
  index: number,
  maxIndex: number = HandleConstants.MAX_INDEX,
  maxHandle: number = HandleConstants.MAX_HANDLE
) {
  if (LOCAL_DEBUG) {
    // expected the index to already be a positive int index from pushing the value
    checkInt!(index, 0);
  }
  if (index > maxIndex) {
    throw new Error(`index ${index} overflowed range 0 to ${maxIndex}`);
  }
  // -1 - 0 == -1
  // -1 - 1073741823 == -1073741824
  // -1073741825 - 0 == -1073741825
  // -1073741825 - 1073741823 == -2147483648
  return maxHandle - index;
}

/**
 * Decodes the index from the specified operand or stack handle.
 */
export function decodeHandle(handle: number, maxHandle: number = HandleConstants.MAX_HANDLE) {
  if (LOCAL_DEBUG) {
    // we expect to be decoding a encoded int32 operand or encoded int32 on the stack
    checkInt!(handle, HandleConstants.MIN_HANDLE, maxHandle);
  }
  // -1 - -1 == 0
  // -1 - -1073741824 == 1073741823
  // -1073741825 - -1073741825 == 0
  // -1073741825 - -2147483648 == 1073741823
  return maxHandle - handle;
}

function isInt(num: number, min: number, max: number): boolean {
  // this is the same as Math.floor(num) === num
  // also NaN % 1 is NaN and Infinity % 1 is NaN so both should fail
  return num % 1 === 0 && num >= min && num <= max;
}
