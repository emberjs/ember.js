import type { AnyFn, SimpleNode } from '@glimmer/interfaces';
import { assertNever } from '@glimmer/debug-util';

import type { Loggable } from './entry';
import type { IntoFormat } from './format';
import type {
  FloatFragment,
  FragmentType,
  IntegerFragment,
  LeafFragment,
  SpecialFragment,
  StringFragment,
} from './fragment-type';
import type { DisplayFragmentOptions } from './logger';

import { LogFragmentBuffer } from './buffer';
import { formats } from './format';
import { FORMATTERS } from './fragment-type';
import { mergeStyle, STYLES } from './styles';

/**
 * @import { StyleName } from './styles';
 */

/**
 * Fragment is the most fundamental building block of the debug logger.
 *
 */
export class Fragment<T extends FragmentType = FragmentType> {
  static integer(
    this: void,
    value: number,
    options?: Omit<IntegerFragment, 'kind' | 'value'> | undefined
  ): Fragment<IntegerFragment> {
    return new Fragment({ kind: 'integer', value, ...options });
  }

  static float(
    this: void,
    value: number,
    options?: Omit<FloatFragment, 'kind' | 'value'> | undefined
  ): Fragment<FloatFragment> {
    return new Fragment({ kind: 'float', value, ...options });
  }

  static string(
    this: void,
    value: string,
    options?: Omit<StringFragment, 'kind' | 'value'> | undefined
  ): Fragment<StringFragment> {
    return new Fragment({ kind: 'string', value, ...options });
  }

  static special(
    this: void,
    value: Node | SimpleNode | AnyFn | unknown[],
    options?: Omit<SpecialFragment, 'kind' | 'value'> | undefined
  ): Fragment<SpecialFragment> {
    return new Fragment({ kind: 'special', value, ...options });
  }

  readonly #type: T;

  constructor(type: T) {
    this.#type = type;
  }

  /**
   * A subtle fragment is only printed if the `showSubtle` option is set.
   *
   * Returns true if this fragment is a subtle leaf or is a multi fragment
   * with all subtle leaves.
   */
  isSubtle(): boolean {
    return this.leaves().every((leaf) => leaf.#type.subtle);
  }

  /**
   * If the current fragment is not empty, apply `ifPresent` to the current
   * fragment. Otherwise, do nothing.
   *
   * If the current fragment is subtle, the result is also subtle.
   */
  map(ifPresent: (value: Fragment) => Fragment): Fragment {
    if (this.isEmpty()) return this;
    const fragment = ifPresent(this);
    return this.isSubtle() ? fragment.subtle() : fragment;
  }

  /**
   * A fragment is empty if it should not be printed with the provided display options.
   *
   * This means that if a fragment is subtle and `showSubtle` is false, the fragment is empty.
   */
  isEmpty(options: DisplayFragmentOptions = { showSubtle: true }): boolean {
    return this.leaves().every((leaf) => !leaf.#shouldShow(options));
  }

  /**
   * Returns an array of {@linkcode LeafFragment}s that make up the current
   * fragment.
   *
   * This effectively flattens any number of nested multi-fragments into a flat array of leaf
   * fragments.
   */
  leaves(): LeafFragment[] {
    if (this.#type.kind === 'multi') {
      return this.#type.value.flatMap((f) => f.leaves());
    } else if (this.#type.kind === 'string' && this.#type.value === '') {
      return [];
    } else {
      return [this as LeafFragment];
    }
  }

  /**
   * Returns a fragment with the specified subtle status without mutating the current fragment.
   *
   * If `isSubtle` is true, the fragment will also be styled with the `subtle` style.
   */
  subtle(isSubtle = true): Fragment<T> {
    if (this.isSubtle() === false && isSubtle === false) {
      return this;
    }

    const fragment = this.#subtle(isSubtle);
    return isSubtle ? fragment.styleAll('dim') : fragment;
  }

  #subtle(isSubtle: boolean): Fragment<T> {
    if (this.#type.kind === 'multi') {
      return new Fragment({
        ...this.#type,
        value: this.leaves().flatMap((f) => f.subtle(isSubtle).leaves()),
      });
    } else {
      return new Fragment({
        ...this.#type,
        subtle: isSubtle,
      });
    }
  }

  /**
   * Apply the specified styles to the current fragment (if it's a leaf) or all
   * of its children (if it's a multi-fragment).
   *
   * Keep in mind that merging styles might be very difficult to undo, so treat
   * this as a low-level operation, and prefer to use higher-level concepts like
   * `subtle` if you can instead.
   */
  styleAll(...allFormats: IntoFormat[]): Fragment<T> {
    if (allFormats.length === 0) return this;

    if (this.#type.kind === 'multi') {
      return new Fragment({
        ...this.#type,
        value: this.#type.value.flatMap((f) => f.styleAll(...allFormats).leaves()),
      });
    } else {
      return new Fragment({
        ...this.#type,
        style: mergeStyle(this.#type.style, formats(...allFormats)),
      });
    }
  }

  /**
   * Convert the current fragment into a string with no additional formatting.
   * The primary purpose for this method is to support converting a fragment
   * into a string for inclusion in thrown Errors. If you're going to *log*
   * a fragment, log it using `DebugLogger` and don't convert it to
   * a string first.
   */
  stringify(options: DisplayFragmentOptions): string {
    return this.leaves()
      .filter((leaf) => leaf.#shouldShow(options))
      .map((leaf) => {
        const fragment = leaf.#type;

        if (fragment.kind === 'value') {
          return `<object>`;
        } else {
          return String(fragment.value);
        }
      })
      .join('');
  }

  /**
   * Should the current fragment be printed with the provided display options?
   *
   * Importantly, if the current fragment contains subtle content but the `showSubtle` option is
   * false, `#shouldShow` will return false.
   *
   * @see isEmpty
   */
  #shouldShow(options: DisplayFragmentOptions): boolean {
    return this.leaves().some((leaf) => {
      const fragment = leaf.#type;

      if (fragment.subtle && !options.showSubtle) {
        return false;
      } else if (fragment.kind === 'string' && fragment.value === '') {
        return false;
      }

      return true;
    });
  }

  /**
   * Convert this fragment into a Loggable for logging through the `DebugLogger`.
   */
  toLoggable(options: DisplayFragmentOptions): Loggable {
    const buffer = new LogFragmentBuffer(options);

    for (const leaf of this.leaves()) {
      leaf.appendTo(buffer);
    }

    return buffer.flush();
  }

  /**
   * Append this fragment to the low-level `LogFragmentBuffer`.
   */
  appendTo(buffer: LogFragmentBuffer): void {
    const fragment = this.#type;
    const subtle = this.isSubtle();

    // If the fragment is a multi fragment, append each of its leaves to the buffer
    // and return.
    if (fragment.kind === 'multi') {
      for (const f of fragment.value) {
        f.appendTo(buffer);
      }

      return;
    }

    // If the fragment is a value fragment and the value is a primitive, give it special
    // treatment since we can trivially serialize it.
    if (fragment.kind === 'value') {
      // If the value is a string or number, convert it into a string, float or integer
      // fragment and append that instead. This means that strings and numbers are
      // represented the same way in logs whether they are explicitly created as string,
      // float or integer fragments *or* whether they are the value of a value fragment.
      if (typeof fragment.value === 'string') {
        return Fragment.string(JSON.stringify(fragment.value), {
          style: STYLES.string,
          subtle,
        }).appendTo(buffer);
      } else if (typeof fragment.value === 'number') {
        const f = fragment.value % 1 === 0 ? Fragment.integer : Fragment.float;
        return f(fragment.value, {
          style: STYLES.number,
          subtle,
        }).appendTo(buffer);

        // Alternatively, if the value of a `value` fragment is `null` or `undefined`,
        // append the string `null` or `undefined`, respectively with the `null` style.
      } else if (fragment.value === null || fragment.value === undefined) {
        return Fragment.string('null', {
          style: STYLES.null,
          subtle: this.isSubtle(),
        }).appendTo(buffer);

        // Finally, if the value of a `value` fragment is boolean, append the string
        // `true` or `false` with the `boolean` style.
      } else if (typeof fragment.value === 'boolean') {
        return Fragment.string(String(fragment.value), {
          style: STYLES.boolean,
          subtle,
        }).appendTo(buffer);
      }

      // All other values (i.e. objects and functions) are represented as footnotes and
      // are handled below.
    }

    switch (fragment.kind) {
      // strings are appended using %s
      case 'string':
      // integers are appended using %d
      case 'integer':
      // floats are appended using %f
      case 'float':
        buffer.append(
          fragment.subtle ?? false,
          `%c${FORMATTERS[fragment.kind]}`,
          fragment.style,
          fragment.value
        );
        break;
      // the remaining value types are represented as footnotes
      // dom nodes are appended to the footnote line using %o
      case 'special':
      // values are appended to the footnote line using %O
      case 'value': {
        // If a fragment has an associated annotation, we'll use the annotation as the
        // footnote rather than the footnote number.
        const override = fragment.kind === 'value' ? fragment.display : undefined;

        buffer.addFootnoted(fragment.subtle ?? false, ({ n, style }, footnote) => {
          const appendValueAsFootnote = (ref: string) =>
            footnote.append(
              subtle,
              `%c| %c[${ref}]%c ${FORMATTERS[fragment.kind]}`,
              STYLES.dim,
              style,
              '',
              fragment.value
            );

          if (override) {
            if ('inline' in override) {
              override.inline.subtle(subtle).appendTo(footnote);
              return false;
            }

            buffer.append(subtle, `%c[${override.ref}]%c`, style, '');

            if (override.footnote) {
              frag`${as.dim('| ')}${override.footnote}`.subtle(subtle).appendTo(footnote);
            } else {
              appendValueAsFootnote(override.ref);
            }
            return false;
          }

          buffer.append(subtle, `%c[${n}]%c`, style, '');
          appendValueAsFootnote(String(n));
          return true;
        });

        break;
      }
      default:
        assertNever(fragment);
    }
  }
}

export type IntoFragment = Fragment | IntoFragment[] | number | string | null;
type IntoLeafFragment = LeafFragment | number | string | null;

export function intoFragment(value: IntoFragment): Fragment {
  const fragments = intoFragments(value);
  const [first, ...rest] = fragments;

  if (first !== undefined && rest.length === 0) {
    return first;
  }

  return new Fragment({ kind: 'multi', value: fragments });
}

function intoFragments(value: IntoFragment): LeafFragment[] {
  if (Array.isArray(value)) {
    return value.flatMap(intoFragments);
  } else if (typeof value === 'object' && value !== null) {
    return value.leaves();
  } else {
    return [intoLeafFragment(value)];
  }
}

function intoLeafFragment(value: IntoLeafFragment): LeafFragment {
  if (value === null) {
    return new Fragment({ kind: 'value', value: null });
  } else if (typeof value === 'number') {
    return new Fragment({ kind: 'integer', value });
  } else if (typeof value === 'string') {
    // If the string contains only whitespace and punctuation, we can treat it as a
    // punctuation fragment.
    if (/^[\s\p{P}\p{Sm}]*$/u.test(value)) {
      return new Fragment({ kind: 'string', value, style: STYLES.punct });
    } else {
      return new Fragment({ kind: 'string', value });
    }
  } else {
    return value;
  }
}

export function frag(strings: TemplateStringsArray, ...values: IntoFragment[]): Fragment {
  const buffer: LeafFragment[] = [];

  strings.forEach((string, i) => {
    buffer.push(...intoFragment(string).leaves());
    const dynamic = values[i];
    if (dynamic) {
      buffer.push(...intoFragment(dynamic).leaves());
    }
  });

  return new Fragment({ kind: 'multi', value: buffer });
}

export const as = Object.fromEntries(
  Object.entries(STYLES).map(([k, v]) => [
    k,
    (value: IntoFragment): Fragment => intoFragment(value).styleAll({ style: v }),
  ])
) as {
  [K in keyof typeof STYLES]: ((value: IntoLeafFragment) => LeafFragment) &
    ((value: IntoFragment) => Fragment);
};
