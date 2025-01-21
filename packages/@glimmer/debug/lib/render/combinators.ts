import type { Fragment, IntoFragment } from './fragment';

import { group, join, value } from './basic';
import { as, frag, intoFragment } from './fragment';

/**
 * The prepend function returns a subtle fragment if the contents are subtle.
 */
export function prepend(before: IntoFragment, contents: Fragment): Fragment {
  return contents.map((f) => frag`${before}${f}`);
}

/**
 * The append function returns a subtle fragment if the contents are subtle.
 */
function append(contents: Fragment, after: IntoFragment): Fragment {
  return contents.map((f) => frag`${f}${after}`);
}
/**
 * The `wrap` function returns a subtle fragment if the contents are subtle.
 */
export function wrap(start: IntoFragment, contents: Fragment, end: IntoFragment) {
  return append(prepend(start, contents), end);
}

export type As<T> = (value: T) => Fragment;

interface EntriesOptions<T> {
  as?: As<T>;
  subtle?: boolean | undefined | ((value: T) => boolean);
}
function normalizeOptions<T>(options: EntriesOptions<T> | undefined): {
  map: (value: T) => Fragment;
  isSubtle: (value: T) => boolean;
} {
  let isSubtle: (value: T) => boolean;

  const subtleOption = options?.subtle;
  if (typeof subtleOption === 'boolean') {
    isSubtle = () => subtleOption;
  } else if (typeof subtleOption === 'function') {
    isSubtle = subtleOption;
  } else {
    isSubtle = () => false;
  }

  return {
    map: options?.as ?? ((value) => intoFragment(value as IntoFragment)),
    isSubtle,
  };
}

/**
 * A compact array makes the wrapping `[]` subtle if there's only one element.
 */
export function compactArray<T>(
  items: readonly T[],
  options: EntriesOptions<T> & {
    when: {
      allSubtle: IntoFragment;
      empty?: IntoFragment;
    };
  }
): Fragment {
  const [first] = items;

  if (first === undefined) {
    return options.when.empty ? intoFragment(options.when.empty) : frag`[]`.subtle();
  }

  const { map, isSubtle } = normalizeOptions(options);

  const contents = items.map((item) => (isSubtle(item) ? frag`${map(item)}`.subtle() : map(item)));
  const body = join(contents, ', ');

  const unsubtle = contents.filter((f) => !f.isSubtle());

  if (unsubtle.length === 0) {
    return intoFragment(options.when.allSubtle).subtle();
  } else if (unsubtle.length === 1) {
    return group(frag`[`.subtle(), body, frag`]`.subtle());
  } else {
    return wrap('[ ', body, ' ]');
  }
}

export function dictionary(entries: Iterable<[key: string, value: unknown]>) {
  return frag`{ ${[...entries].map(([k, v]) => frag`${as.attrName(k)}=${value(v)}`)} }`;
}

export function array(items: IntoFragment[]): Fragment;
export function array<T>(items: T[] | readonly T[], options: EntriesOptions<T>): Fragment;
export function array(
  items: unknown[] | readonly unknown[],
  options?: EntriesOptions<unknown>
): Fragment {
  if (items.length === 0) {
    return frag`[]`;
  } else {
    const { map, isSubtle } = normalizeOptions(options);

    const contents = items.map((item) =>
      isSubtle(item) ? frag`${map(item)}`.subtle() : map(item)
    );
    return wrap('[ ', join(contents, as.punct(', ')), ' ]');
  }
}

export function ifSubtle(fragment: IntoFragment): Fragment {
  return intoFragment(fragment).subtle();
}
