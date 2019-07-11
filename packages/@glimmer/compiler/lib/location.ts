import { Option } from '@glimmer/interfaces';

type SourceOffset = number;

export function locationToOffset(
  source: string,
  line: number,
  column: number
): Option<SourceOffset> {
  let seenLines = 0;
  let seenChars = 0;

  while (true) {
    if (seenChars === source.length) return null;

    let nextLine = source.indexOf('\n', seenChars);
    if (nextLine === -1) nextLine = source.length;

    if (seenLines === line) {
      if (seenChars + column > nextLine) return null;
      return seenChars + column;
    } else if (nextLine === -1) {
      return null;
    } else {
      seenLines += 1;
      seenChars = nextLine + 1;
    }
  }
}

interface SourceLocation {
  line: number;
  column: number;
}

export function offsetToLocation(source: string, offset: number): Option<SourceLocation> {
  let seenLines = 0;
  let seenChars = 0;

  if (offset > source.length) {
    return null;
  }

  while (true) {
    let nextLine = source.indexOf('\n', seenChars);

    if (offset <= nextLine || nextLine === -1) {
      return {
        line: seenLines,
        column: offset - seenChars,
      };
    } else {
      seenLines += 1;
      seenChars = nextLine + 1;
    }
  }
}
