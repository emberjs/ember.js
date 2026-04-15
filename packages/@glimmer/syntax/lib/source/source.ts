import { DEBUG } from '@glimmer/env';
import type { Nullable } from '@glimmer/interfaces';
import { localAssert, setLocalDebugType } from '@glimmer/debug-util';

import type { PrecompileOptions } from '../parser/tokenizer-event-handlers';
import type { SourceLocation, SourcePosition } from './location';

import { SourceOffset, SourceSpan } from './span';

export class Source {
  static from(source: string, options: PrecompileOptions = {}): Source {
    return new Source(source, options.meta?.moduleName);
  }

  /** Char offset of each `\n` in the source. */
  readonly #newlineOffsets: readonly number[];

  constructor(
    readonly source: string,
    readonly module = 'an unknown module'
  ) {
    setLocalDebugType('syntax:source', this);
    this.#newlineOffsets = computeNewlineOffsets(source);
  }

  /**
   * Validate that the character offset represents a position in the source string.
   */
  validate(offset: number): boolean {
    return offset >= 0 && offset <= this.source.length;
  }

  slice(start: number, end: number): string {
    return this.source.slice(start, end);
  }

  offsetFor(line: number, column: number): SourceOffset {
    return SourceOffset.forHbsPos(this, { line, column });
  }

  spanFor({ start, end }: Readonly<SourceLocation>): SourceSpan {
    return SourceSpan.forHbsLoc(this, {
      start: { line: start.line, column: start.column },
      end: { line: end.line, column: end.column },
    });
  }

  hbsPosFor(offset: number): Nullable<SourcePosition> {
    if (offset > this.source.length) return null;
    const lineIdx = lowerBound(this.#newlineOffsets, offset);
    return { line: lineIdx + 1, column: offset - this.#lineStartFor(lineIdx) };
  }

  charPosFor({ line, column }: SourcePosition): number | null {
    const lineIdx = line - 1;
    const lineStart = this.#lineStartFor(lineIdx);
    const nextNl = this.#newlineOffsets[lineIdx];
    const lineEnd = nextNl ?? this.source.length;
    const target = lineStart + column;

    if (target <= lineEnd) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (DEBUG) {
        const roundTrip = this.hbsPosFor(target);
        localAssert(roundTrip !== null, `the returned offset failed to round-trip`);
        localAssert(roundTrip.line === line, `line round-trip mismatch`);
        localAssert(roundTrip.column === column, `column round-trip mismatch`);
      }
      return target;
    }
    return lineEnd;
  }

  #lineStartFor(lineIdx: number): number {
    if (lineIdx === 0) return 0;
    const prevNl = this.#newlineOffsets[lineIdx - 1];
    return prevNl === undefined ? 0 : prevNl + 1;
  }
}

function computeNewlineOffsets(source: string): number[] {
  const offsets: number[] = [];
  for (let i = source.indexOf('\n'); i !== -1; i = source.indexOf('\n', i + 1)) {
    offsets.push(i);
  }
  return offsets;
}

/** Lower-bound binary search: smallest i with arr[i] >= target, else arr.length. */
function lowerBound(arr: readonly number[], target: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    // mid is in [lo, hi) so always a valid index.
    if ((arr[mid] as number) < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
