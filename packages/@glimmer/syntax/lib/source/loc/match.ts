import { assert, isPresent } from '@glimmer/util';

import { CharPosition, HbsPosition, InvisiblePosition, OffsetKind, PositionData } from './offset';

/**
 * This file implements the DSL used by span and offset in places where they need to exhaustively
 * consider all combinations of states (Handlebars offsets, character offsets and invisible/broken
 * offsets).
 *
 * It's probably overkill, but it makes the code that uses it clear. It could be refactored or
 * removed.
 */

export const MatchAny = 'MATCH_ANY';
export type MatchAny = 'MATCH_ANY';

type Matches =
  | 'Char,Hbs'
  | 'Hbs,Char'
  | 'Hbs,Hbs'
  | 'Char,Char'
  | 'Invisible,Any'
  | 'Any,Invisible';

export const IsInvisible = 'IS_INVISIBLE';
export type IsInvisible = 'IS_INVISIBLE';

type Pattern = OffsetKind | IsInvisible | MatchAny;

class WhenList<Out> {
  #whens: When<Out>[];

  constructor(whens: When<Out>[]) {
    this.#whens = whens;
  }

  first(kind: OffsetKind): Out | null {
    for (let when of this.#whens) {
      let value = when.match(kind);
      if (isPresent(value)) {
        return value[0];
      }
    }

    return null;
  }
}

class When<Out> {
  #map: Map<Pattern, Out> = new Map();

  get(pattern: Pattern, or: () => Out): Out {
    let value = this.#map.get(pattern);

    if (value) {
      return value;
    }

    value = or();

    this.#map.set(pattern, value);

    return value;
  }

  add(pattern: Pattern, out: Out): void {
    this.#map.set(pattern, out);
  }

  match(kind: OffsetKind): Out[] {
    let pattern = patternFor(kind);

    let out: Out[] = [];

    let exact = this.#map.get(pattern);
    let fallback = this.#map.get(MatchAny);

    if (exact) {
      out.push(exact);
    }

    if (fallback) {
      out.push(fallback);
    }

    return out;
  }
}

type ExhaustiveCheck<Out, In extends Matches, Removed extends Matches> = Exclude<
  In,
  Removed
> extends never
  ? ExhaustiveMatcher<Out>
  : Matcher<Out, Exclude<In, Removed>>;

export type MatchFn<Out> = (left: PositionData, right: PositionData) => Out;

interface ExhaustiveMatcher<Out> {
  check(): MatchFn<Out>;
}

export function match<Out>(callback: (m: Matcher<Out>) => ExhaustiveMatcher<Out>): MatchFn<Out> {
  return callback(new Matcher()).check();
}

class Matcher<Out, M extends Matches = Matches> {
  #whens: When<When<(left: PositionData, right: PositionData) => Out>> = new When();

  /**
   * You didn't exhaustively match all possibilities.
   */
  protected check(): MatchFn<Out> {
    return (left, right) => this.matchFor(left.kind, right.kind)(left, right);
  }

  private matchFor(
    left: OffsetKind,
    right: OffsetKind
  ): (left: PositionData, right: PositionData) => Out {
    let nesteds = this.#whens.match(left);

    assert(
      isPresent(nesteds),
      `no match defined for (${left}, ${right}) and no AnyMatch defined either`
    );

    let callback = new WhenList(nesteds).first(right);

    assert(
      callback !== null,
      `no match defined for (${left}, ${right}) and no AnyMatch defined either`
    );

    return callback;
  }

  // This big block is the bulk of the heavy lifting in this file. It facilitates exhaustiveness
  // checking so that matchers can ensure they've actually covered all the cases (and TypeScript
  // will treat it as an exhaustive match).
  when(
    left: OffsetKind.CharPosition,
    right: OffsetKind.HbsPosition,
    callback: (left: CharPosition, right: HbsPosition) => Out
  ): ExhaustiveCheck<Out, M, 'Char,Hbs'>;
  when(
    left: OffsetKind.HbsPosition,
    right: OffsetKind.CharPosition,
    callback: (left: HbsPosition, right: CharPosition) => Out
  ): ExhaustiveCheck<Out, M, 'Hbs,Char'>;
  when(
    left: OffsetKind.HbsPosition,
    right: OffsetKind.HbsPosition,
    callback: (left: HbsPosition, right: HbsPosition) => Out
  ): ExhaustiveCheck<Out, M, 'Hbs,Hbs'>;
  when(
    left: OffsetKind.CharPosition,
    right: OffsetKind.CharPosition,
    callback: (left: CharPosition, right: CharPosition) => Out
  ): ExhaustiveCheck<Out, M, 'Char,Char'>;
  when(
    left: IsInvisible,
    right: MatchAny,
    callback: (left: InvisiblePosition, right: PositionData) => Out
  ): Matcher<Out, Exclude<M, 'Invisible,Any'>>;
  when(
    left: MatchAny,
    right: IsInvisible,
    callback: (left: PositionData, right: InvisiblePosition) => Out
  ): ExhaustiveCheck<Out, M, 'Any,Invisible'>;
  when(
    left: MatchAny,
    right: MatchAny,
    callback: (left: PositionData, right: PositionData) => Out
  ): ExhaustiveMatcher<Out>;
  when(
    left: Pattern,
    right: Pattern,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (left: any, right: any) => Out
  ): Matcher<Out, Matches> | ExhaustiveMatcher<Out> {
    this.#whens.get(left, () => new When()).add(right, callback);

    return this;
  }
}

function patternFor(kind: OffsetKind): Pattern {
  switch (kind) {
    case OffsetKind.Broken:
    case OffsetKind.InternalsSynthetic:
    case OffsetKind.NonExistent:
      return IsInvisible;
    default:
      return kind;
  }
}
