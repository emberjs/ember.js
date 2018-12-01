const tuple = <T extends string[]>(...args: T) => args;

export const OPERAND_TYPES = tuple(
  'handle',
  'i32',
  'u32',
  'to',
  'str',
  'option-str',
  'str-array',
  'array',
  'bool',
  'primitive',
  'table',
  'symbol',
  'block',
  'register',
  'serializable',
  'lazy-constant'
);

export const REGISTERS = tuple('$ra', '$fp');

function isOperandType(s: string): s is OperandType {
  return OPERAND_TYPES.indexOf(s as any) !== -1;
}

function isRegister(s: string): s is Register {
  return REGISTERS.indexOf(s as any) !== -1;
}

export type OperandType = typeof OPERAND_TYPES[number];
export type Register = typeof REGISTERS[number];

export interface ParsedAnyType {
  readonly type: string;
  readonly name: 'constant' | 'machine' | 'prefix';
}

export interface ParsedReference {
  readonly type: string;
  readonly name: 'reference';
}

export interface ParsedRegister {
  readonly type: Register;
  readonly name: 'register';
}

export interface ParsedOp {
  readonly op: string;
  readonly operands: ReadonlyArray<ParsedOperand>;
}

export interface ParsedOperand {
  readonly name: string;
  readonly type: OperandType;
}

export type ParsedType = ParsedAnyType | ParsedReference | ParsedRegister;

export interface Stack {
  readonly before: ParsedType[];
  readonly after: ParsedType[];
}

export class OpcodeMetadata {
  constructor(readonly desc: string, readonly opcode: ParsedOp, readonly stack: Stack) {}
}

type Check<T> = (v: unknown) => v is T;

export const PREFIX: ParsedType = { type: '...', name: 'prefix' };

export class OpcodeMetadataParser {
  private pos = 0;

  constructor(private input: string) {}

  parse(): OpcodeMetadata {
    this.expect('Operation:');
    this.ws();

    let desc = this.readSection('Format:');
    let op = this.readFormat();
    let stack = this.readStack();

    return new OpcodeMetadata(desc, op, stack);
  }

  private get rest(): string {
    return this.input.slice(this.pos);
  }

  private readSection(until: string) {
    let out = [];

    while (this.peek(until.length) !== until) {
      out.push(this.consumeLine().trim());
    }

    return out.join(' ').trim();
  }

  private readFormat(): ParsedOp {
    this.expect('Format:');
    this.consumeLine();

    this.ws();

    this.expect('(');
    let op = this.expectMatch(/^(\w+)/);

    this.ws();

    let operands = [];

    while (this.peek(1) !== ')') {
      operands.push(this.readOperand());
    }

    this.expect(')');
    this.consumeLine();

    return { op, operands };
  }

  readOperand(): ParsedOperand {
    let name = this.expectMatch(/^([A-Za-z0-9\-]+)/);
    this.expect(':');
    let type = parseOperandType(this.expectMatch(/^([^\s\)]*)/));
    this.ws();

    return { name, type };
  }

  private readStack(): Stack {
    this.expect('Operand Stack:');
    this.consumeLine();

    this.ws();

    let before = parseStackList(this.expectMatch(/^(.*)→/));
    this.expect('\n');
    let after = parseStackList(this.consumeLine());

    return { before, after };
  }

  private peek(size: number): string {
    return this.rest.slice(0, size);
  }

  private expect(next: string) {
    let { rest } = this;

    if (rest.startsWith(next)) {
      this.pos += next.length;
    } else {
      throw new Error(`Expected: ${next}, found ${JSON.stringify(rest)}`);
    }
  }

  private expectMatch(next: RegExp): string {
    let matched = this.check(
      this.rest.match(next),
      ((m: any) => m && m[0] && m[1]) as Check<[string, string]>,
      `Expected matched ${next}, found ${JSON.stringify(this.rest)}`
    );

    this.pos += matched[0].length;

    return matched[1];
  }

  private ws() {
    let matched = this.check(
      this.rest.match(/\s*/),
      (m => m !== null) as Check<[string]>,
      `Expected matched line, found ${JSON.stringify(this.rest)}`
    );

    this.pos += matched[0].length;
  }

  private consumeLine(): string {
    let matched = this.check(
      this.rest.match(/(.*)(\n|$)/),
      (m => m !== null) as Check<[string, string]>,
      `Expected matched line, found ${JSON.stringify(this.rest)}`
    );

    this.pos += matched[0].length;

    return matched[1];
  }

  private check<T>(v: unknown, pred: Check<T>, message: string): T {
    if (pred(v)) {
      return v;
    } else {
      throw new Error(`Expectation Failure: ${message}`);
    }
  }
}

function parseOperandType(type: string): OperandType {
  if (isOperandType(type)) {
    return type;
  } else {
    throw new Error(`Expected operand type, got ${type}`);
  }
}

function parseStackList(list: string): ParsedType[] {
  let items = list.trim().split(/,\s*/);
  return items.map(parseStackElement);
}

function parseStackElement(element: string): ParsedType {
  if (element === '...') {
    return { type: '...', name: 'prefix' };
  } else {
    return parseAnyType(element);
  }
}

function parseAnyType(name: string): ParsedType {
  if (isRegister(name)) {
    return { name: 'register', type: name };
  } else {
    return { name: 'reference', type: name };
  }
}
