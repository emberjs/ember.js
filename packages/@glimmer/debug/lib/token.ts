import { CharClass, char, ToCharClass, toCharClass, isToCharClass, match } from './matching';
import { Option } from '@glimmer/interfaces';

const MATCH = Symbol('MATCH');

export interface CharsClass {
  [MATCH](s: string, offset: number): Option<number>;
  describe(): string;
}

export function matchChars(s: string, offset: number, chars: CharsClass): Option<number> {
  return chars[MATCH](s, offset);
}

export type ToCharsClass = ToCharClass | CharsClass;

export function toCharsClass(to: ToCharsClass): CharsClass {
  if (isToCharClass(to)) {
    return new OnceChars(toCharClass(to));
  } else {
    return to;
  }
}

export class StarChars implements CharsClass {
  constructor(private inner: CharClass) {}

  [MATCH](s: string, offset: number): number {
    let pos = 0;

    while (match(s, offset + pos, this.inner)) {
      pos += 1;
    }

    return pos;
  }

  describe() {
    return `${this.inner.describe()}*`;
  }
}

export class OnceChars implements CharsClass {
  constructor(private readonly inner: CharClass) {}

  [MATCH](s: string, offset: number): Option<number> {
    if (match(s, offset, this.inner)) {
      return 1;
    } else {
      return null;
    }
  }

  describe(): string {
    return this.inner.describe();
  }
}

export class CountChars implements CharsClass {
  static exactly(inner: CharClass, count: number) {
    return new CountChars(inner, count, count);
  }

  constructor(
    private readonly inner: CharClass,
    private readonly min: number,
    private readonly max: number
  ) {}

  [MATCH](s: string, offset: number): Option<number> {
    let pos = 0;

    while (match(s, offset + pos, this.inner) && pos < this.max) {
      pos += 1;
    }

    if (pos < this.min) {
      return null;
    } else {
      return pos;
    }
  }

  describe(): string {
    if (this.min === this.max) {
      return `${this.inner.describe()}{${this.min}}`;
    } else {
      return `${this.inner.describe()}{${this.min},${this.max}}`;
    }
  }
}

export class OptionalChars implements CharsClass {
  constructor(private readonly inner: CharClass) {}

  [MATCH](s: string, offset: number): number {
    if (match(s, offset, this.inner)) {
      return 1;
    } else {
      return 0;
    }
  }

  describe(): string {
    return `${this.inner.describe()}?`;
  }
}

export const MATCH_TOKEN = Symbol('MATCH_TOKEN');

export interface Token {
  [MATCH_TOKEN](s: string, offset: number): number;
  readonly chars: ReadonlyArray<CharsClass>;
  describe(): string;
}

export function isToken(t: unknown): t is Token {
  return t && typeof (t as any)[MATCH_TOKEN] === 'function';
}

export function matchToken(s: string, offset: number, token: Token): number {
  return token[MATCH_TOKEN](s, offset);
}

export type ToToken = Token | ToCharsClass;

export function toToken(to: ToToken): Token {
  if (isToken(to)) {
    return to;
  } else {
    return new TokenImpl([toCharsClass(to)]);
  }
}

export class TokenImpl implements Token {
  constructor(readonly chars: ReadonlyArray<CharsClass>) {}

  [MATCH_TOKEN](s: string, offset: number): number {
    let count = 0;

    for (let possible of this.chars) {
      let found = matchChars(s, offset + count, possible);

      if (found !== null) {
        count += found;
      } else {
        return 0;
      }
    }

    return count;
  }

  describe(): string {
    let out = '';

    for (let chars of this.chars) {
      out += chars.describe();
    }

    return out;
  }
}

export function literal(str: string): Token {
  let out = [];

  for (let c of str) {
    let charClass = char(c);
    out.push(new OnceChars(charClass));
  }

  return new TokenImpl(out);
}

export function repeat(char: ToCharClass): CharsClass {
  return new StarChars(toCharClass(char));
}

export function optional(char: ToCharClass): CharsClass {
  return new OptionalChars(toCharClass(char));
}

export function token(...chars: (ToCharsClass | Token)[]): Token {
  let out = [];

  for (let char of chars) {
    if (isToken(char)) {
      out.push(...char.chars);
    } else {
      out.push(toCharsClass(char));
    }
  }

  return new TokenImpl(out);
}
