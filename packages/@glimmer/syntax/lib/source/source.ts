// eslint-disable-next-line import/no-extraneous-dependencies
import { DEBUG } from '@glimmer/env';
import type { Option } from '@glimmer/interfaces';
import { assert } from '@glimmer/util';

import { SourceLocation, SourcePosition } from './location';
import { SourceOffset, SourceSpan } from './span';

export class Source {
  constructor(readonly source: string, readonly module: string = 'an unknown module') {}

  /**
   * Validate that the character offset represents a position in the source string.
   */
  check(offset: number): boolean {
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

  hbsPosFor(offset: number): Option<SourcePosition> {
    let seenLines = 0;
    let seenChars = 0;

    if (offset > this.source.length) {
      return null;
    }

    while (true) {
      let nextLine = this.source.indexOf('\n', seenChars);

      if (offset <= nextLine || nextLine === -1) {
        return {
          line: seenLines + 1,
          column: offset - seenChars,
        };
      } else {
        seenLines += 1;
        seenChars = nextLine + 1;
      }
    }
  }

  charPosFor(position: SourcePosition): number | null {
    let { line, column } = position;
    let sourceString = this.source;
    let sourceLength = sourceString.length;
    let seenLines = 0;
    let seenChars = 0;

    while (true) {
      if (seenChars >= sourceLength) return sourceLength;

      let nextLine = this.source.indexOf('\n', seenChars);
      if (nextLine === -1) nextLine = this.source.length;

      if (seenLines === line - 1) {
        if (seenChars + column > nextLine) return nextLine;

        if (DEBUG) {
          let roundTrip = this.hbsPosFor(seenChars + column);
          assert(roundTrip !== null, `the returned offset failed to round-trip`);
          assert(roundTrip.line === line, `the round-tripped line didn't match the original line`);
          assert(
            roundTrip.column === column,
            `the round-tripped column didn't match the original column`
          );
        }

        return seenChars + column;
      } else if (nextLine === -1) {
        return 0;
      } else {
        seenLines += 1;
        seenChars = nextLine + 1;
      }
    }
  }
}
