function escapeCharClass(s: string): string {
  return s.replace(/[-\\^\]]/g, '\\$&');
}

export const CHAR_CLASS = Symbol('CHAR_CLASS');
export const MATCH = Symbol('MATCH');

export function isCharClass(input: unknown): input is CharClass {
  return !!(input && (input as any)[CHAR_CLASS]);
}

export interface CharClass {
  readonly [CHAR_CLASS]: boolean;
  [MATCH](s: string, offset: number): boolean;

  // TODO: this almost certainly makes more sense as a required field
  // than an operation.
  negate(): CharClass;
  or(other: CharClass): CharClass;
  describe(): string;
}

export function match(s: string, offset: number, char: CharClass): boolean {
  if (offset >= s.length) {
    return false;
  } else {
    return char[MATCH](s, offset);
  }
}

export type ToCharClass = CharClass | string;

export function isToCharClass(to: unknown): to is ToCharClass {
  return typeof to === 'string' || isCharClass(to);
}

export function toCharClass(to: ToCharClass): CharClass {
  if (typeof to === 'string') {
    let m = to.match(/^(.)\.\.(.)$/);

    if (m) {
      return range(m[1], m[2]);
    } else if (to.length === 1) {
      return char(to);
    } else {
      return chars(to);
    }
  } else {
    return to;
  }
}

class SingleChar implements CharClass {
  readonly [CHAR_CLASS] = true;

  constructor(private char: string, private isNegated = false) {}

  [MATCH](s: string, offset: number): boolean {
    let char = s.charAt(offset);
    return this.isNegated ? char !== this.char : char === this.char;
  }

  negate(): CharClass {
    return new SingleChar(this.char, true);
  }

  or(other: CharClass): CharClass {
    return new AnyCharClass([this, other]);
  }

  describe(): string {
    if (this.isNegated) {
      return `[^${this.char}]`;
    } else {
      return this.char;
    }
  }
}

class AnyCharClass implements CharClass {
  readonly [CHAR_CLASS] = true;

  constructor(private classes: CharClass[], private isNegated = false) {}

  [MATCH](s: string, offset: number): boolean {
    let matched = this.classes.some(c => match(s, offset, c));

    return this.isNegated ? !matched : matched;
  }

  negate(): CharClass {
    return new AnyCharClass(this.classes, true);
  }

  or(other: CharClass): CharClass {
    let classes = [...this.classes, other];
    return new AnyCharClass(classes, this.isNegated);
  }

  describe(): string {
    let classes = this.classes.map(c => c.describe()).join('|');
    let prefix = this.isNegated ? `<not>` : '<any>';

    return `${prefix}(${classes})`;
  }
}

class CharSet implements CharClass {
  readonly [CHAR_CLASS] = true;

  constructor(private chars: string, private isNegated = false) {}

  private get escaped(): string {
    return escapeCharClass(this.chars);
  }

  private get negateChar(): string {
    return this.isNegated ? '^' : '';
  }

  [MATCH](s: string, offset: number): boolean {
    let re = new RegExp(`[${this.negateChar}${this.escaped}]`);
    let match = re.exec(s.charAt(offset));

    return !!match;
  }

  negate(): CharClass {
    return new CharSet(this.chars, !this.isNegated);
  }

  or(other: CharClass): CharClass {
    let classes = [this, other];
    return new AnyCharClass(classes, this.isNegated);
  }

  describe(): string {
    return `[${this.negateChar}${this.escaped}]`;
  }
}

class AnyChar implements CharClass {
  readonly [CHAR_CLASS] = true;

  [MATCH](): boolean {
    return true;
  }

  negate(): CharClass {
    return NONE;
  }

  or(): CharClass {
    return this;
  }

  describe(): string {
    return `.`;
  }
}

class NoChar implements CharClass {
  readonly [CHAR_CLASS] = true;

  [MATCH](): boolean {
    return false;
  }

  negate(): CharClass {
    return ANY;
  }

  or(other: CharClass): CharClass {
    return other;
  }

  describe(): string {
    return `<none>`;
  }
}

class CharRange implements CharClass {
  readonly [CHAR_CLASS] = true;

  constructor(private from: string, private to: string, private isNegated = false) {}

  private get range(): string {
    let from = escapeCharClass(this.from);
    let to = escapeCharClass(this.to);

    return `${from}-${to}`;
  }

  private get negateChar(): string {
    return this.isNegated ? '^' : '';
  }

  [MATCH](s: string, offset: number): boolean {
    let re = new RegExp(`[${this.negateChar}${this.range}]`);
    return re.test(s.charAt(offset));
  }

  negate(): CharClass {
    return new CharRange(this.from, this.to, this.isNegated);
  }

  or(other: CharClass): CharClass {
    let classes = [this, other];
    return new AnyCharClass(classes, this.isNegated);
  }

  describe(): string {
    return `[${this.negateChar}${this.range}]`;
  }
}

export const ANY = new AnyChar();
export const NONE = new NoChar();

export function char(char: string): CharClass {
  return new SingleChar(char);
}

export function chars(chars: string): CharClass {
  return new CharSet(chars);
}

export function range(from: string, to: string): CharClass {
  return new CharRange(from, to);
}

export function any(...chars: ToCharClass[]): CharClass {
  let charClasses = chars.map(toCharClass);

  return new AnyCharClass(charClasses);
}

export function not(char: ToCharClass): CharClass {
  return toCharClass(char).negate();
}
