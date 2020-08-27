import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { debugAssert as assert } from './assert';

/*
  Encoding notes

  We use 30 bit integers for encoding, so that we don't ever encode a non-SMI
  integer to push on the stack.

  Handles are >= 0
  Immediates are < 0

  True, False, Undefined and Null are pushed as handles into the symbol table,
  with well known handles (0, 1, 2, 3)

  The negative space is divided into positives and negatives. Positives are
  higher numbers (-1, -2, -3, etc), negatives are lower.

  We only encode immediates for two reasons:

  1. To transfer over the wire, so they're smaller in general
  2. When pushing values onto the stack from the low level/inner VM, which may
     be converted into WASM one day.

  This allows the low-level VM to always use SMIs, and to minimize using JS
  values via handles for things like the stack pointer and frame pointer.
  Externally, most code pushes values as JS values, except when being pulled
  from the append byte code where it was already encoded.

  Logically, this is because the low level VM doesn't really care about these
  higher level values. For instance, the result of a userland helper may be a
  number, or a boolean, or undefined/null, but it's extra work to figure that
  out and push it correctly, vs. just pushing the value as a JS value with a
  handle.

  Note: The details could change here in the future, this is just the current
  strategy.
*/

export const enum ImmediateConstants {
  MAX_SMI = 2 ** 30 - 1,
  MIN_SMI = ~MAX_SMI,
  SIGN_BIT = ~(2 ** 29),
  MAX_INT = ~SIGN_BIT - 1,
  MIN_INT = ~MAX_INT,

  FALSE_HANDLE = 0,
  TRUE_HANDLE = 1,
  NULL_HANDLE = 2,
  UNDEFINED_HANDLE = 3,

  ENCODED_FALSE_HANDLE = FALSE_HANDLE,
  ENCODED_TRUE_HANDLE = TRUE_HANDLE,
  ENCODED_NULL_HANDLE = NULL_HANDLE,
  ENCODED_UNDEFINED_HANDLE = UNDEFINED_HANDLE,
}

export function isHandle(value: number) {
  return value >= 0;
}

export function isNonPrimitiveHandle(value: number) {
  return value > ImmediateConstants.ENCODED_UNDEFINED_HANDLE;
}

export function constants(...values: unknown[]): unknown[] {
  return [false, true, null, undefined, ...values];
}

export function isSmallInt(value: number) {
  return (
    value % 1 === 0 && value <= ImmediateConstants.MAX_INT && value >= ImmediateConstants.MIN_INT
  );
}

export function encodeNegative(num: number) {
  if (LOCAL_DEBUG) {
    assert(
      num % 1 === 0 && num >= ImmediateConstants.MIN_INT && num < 0,
      `Could not encode negative: ${num}`
    );
  }

  return num & ImmediateConstants.SIGN_BIT;
}

export function decodeNegative(num: number) {
  if (LOCAL_DEBUG) {
    assert(
      num % 1 === 0 && num < ~ImmediateConstants.MAX_INT && num >= ImmediateConstants.MIN_SMI,
      `Could not decode negative: ${num}`
    );
  }

  return num | ~ImmediateConstants.SIGN_BIT;
}

export function encodePositive(num: number) {
  if (LOCAL_DEBUG) {
    assert(
      num % 1 === 0 && num >= 0 && num <= ImmediateConstants.MAX_INT,
      `Could not encode positive: ${num}`
    );
  }

  return ~num;
}

export function decodePositive(num: number) {
  if (LOCAL_DEBUG) {
    assert(
      num % 1 === 0 && num <= 0 && num >= ~ImmediateConstants.MAX_INT,
      `Could not decode positive: ${num}`
    );
  }

  return ~num;
}

export function encodeHandle(num: number) {
  if (LOCAL_DEBUG) {
    assert(
      num % 1 === 0 && num >= 0 && num <= ImmediateConstants.MAX_SMI,
      `Could not encode handle: ${num}`
    );
  }

  return num;
}

export function decodeHandle(num: number) {
  if (LOCAL_DEBUG) {
    assert(
      num % 1 === 0 && num <= ImmediateConstants.MAX_SMI && num >= 0,
      `Could not decode handle: ${num}`
    );
  }

  return num;
}

export function encodeImmediate(num: number) {
  num |= 0;
  return num < 0 ? encodeNegative(num) : encodePositive(num);
}

export function decodeImmediate(num: number) {
  num |= 0;
  return num > ImmediateConstants.SIGN_BIT ? decodePositive(num) : decodeNegative(num);
}

// Warm
[1, 2, 3].forEach((x) => decodeHandle(encodeHandle(x)));
[1, -1].forEach((x) => decodeImmediate(encodeImmediate(x)));
