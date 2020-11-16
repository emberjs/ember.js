import { PresentArray } from '@glimmer/interfaces';
import { isPresent } from '@glimmer/util';

import { SourceSpan } from './span';

export interface SourceLocation {
  start: SourcePosition;
  end: SourcePosition;
}

export interface SourcePosition {
  /** >= 1 */
  line: number;
  /** >= 0 */
  column: number;
}

export const UNKNOWN_POSITION = Object.freeze({
  line: 1,
  column: 0,
} as const);

export const SYNTHETIC_LOCATION = Object.freeze({
  source: '(synthetic)',
  start: UNKNOWN_POSITION,
  end: UNKNOWN_POSITION,
} as const);

/** @deprecated */
export const SYNTHETIC = SYNTHETIC_LOCATION;

export const TEMPORARY_LOCATION = Object.freeze({
  source: '(temporary)',
  start: UNKNOWN_POSITION,
  end: UNKNOWN_POSITION,
} as const);

export const NON_EXISTENT_LOCATION = Object.freeze({
  source: '(nonexistent)',
  start: UNKNOWN_POSITION,
  end: UNKNOWN_POSITION,
} as const);

export const BROKEN_LOCATION = Object.freeze({
  source: '(broken)',
  start: UNKNOWN_POSITION,
  end: UNKNOWN_POSITION,
} as const);

export type LocatedWithSpan = { offsets: SourceSpan };
export type LocatedWithOptionalSpan = { offsets: SourceSpan | null };

export type LocatedWithPositions = { loc: SourceLocation };
export type LocatedWithOptionalPositions = { loc?: SourceLocation };

export function isLocatedWithPositionsArray(
  location: LocatedWithOptionalPositions[]
): location is PresentArray<LocatedWithPositions> {
  return isPresent(location) && location.every(isLocatedWithPositions);
}

export function isLocatedWithPositions(
  location: LocatedWithOptionalPositions
): location is LocatedWithPositions {
  return location.loc !== undefined;
}

export type HasSourceLocation =
  | SourceLocation
  | LocatedWithPositions
  | PresentArray<LocatedWithPositions>;

export type MaybeHasSourceLocation =
  | null
  | LocatedWithOptionalPositions
  | LocatedWithOptionalPositions[];
