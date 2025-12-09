import type { AnyFn, SimpleNode } from '@glimmer/interfaces';

import type { Fragment } from './fragment';

export const FORMATTERS = {
  value: '%O',
  string: '%s',
  integer: '%d',
  float: '%f',
  special: '%o',
} as const;

interface AbstractLeafFragment {
  readonly value: unknown;
  readonly style?: string | undefined;
  readonly subtle?: boolean;
}

/**
 * A leaf fragment that represents an arbitrary value.
 *
 * When the value is a primitive, the fragment is appended to the buffer as if it was an instance of
 * the appropriate leaf fragment type (e.g. strings are appended as if they were `StringFragment`).
 *
 * Otherwise, `ValueFragment` is appended to the current line as a footnote reference and the value
 * itself is appended to a later line that *defines* the footnote using the `%O` format specifier.
 */
export interface ValueFragment extends AbstractLeafFragment {
  readonly kind: 'value';
  readonly value: unknown;

  /**
   * The `ValueFragment` is appended to the current line as a footnote reference (e.g. `[1]`) and
   * the value itself is appended to a later line that *defines* the footnote (e.g. `[1]
   * ObjectHere`).
   *
   * By default, the footnote reference is an incrementing number per log line, and the footnote
   * value is formatted using the `%O` format specifier.
   *
   * The `display` property can be provided to override these defaults.
   */
  readonly display?:
    | { ref: string; footnote?: Fragment | undefined }
    | { inline: Fragment }
    | undefined;
}

/**
 * A leaf fragment that represents a string value.
 *
 * Corresponds to the `%s` format specifier.
 */
export interface StringFragment extends AbstractLeafFragment {
  readonly kind: 'string';
  readonly value: string;
}

/**
 * A leaf fragment that represents an integer value.
 *
 * Corresponds to the `%d` format specifier.
 */
export interface IntegerFragment extends AbstractLeafFragment {
  readonly kind: 'integer';
  readonly value: number;
}

/**
 * A leaf fragment that represents a float value.
 *
 * Corresponds to the `%f` format specifier.
 */
export interface FloatFragment extends AbstractLeafFragment {
  readonly kind: 'float';
  readonly value: number;
}

/**
 * A leaf fragment that represents a DOM node.
 *
 * Corresponds to the `%o` format specifier.
 */
export interface SpecialFragment extends AbstractLeafFragment {
  readonly kind: 'special';
  readonly value: SimpleNode | Node | AnyFn | unknown[];
}

/**
 * The list of leaf fragment types correspond exactly to the list of console.log
 * format specifiers.
 */
export type LeafFragmentType =
  | StringFragment
  | IntegerFragment
  | FloatFragment
  | ValueFragment
  | SpecialFragment;

export type FragmentType =
  | LeafFragmentType
  | {
      kind: 'multi';
      value: LeafFragment[];
    };

export type LeafFragment = Fragment<LeafFragmentType>;
