import { Option, Dict } from '@glimmer/interfaces';
import { Token, literal, repeat, token, optional, ToToken, toToken, matchToken } from './token';
import { any, not, ANY } from './matching';

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

export interface ParsedMnemonic {
  readonly shorthand: string;
  readonly machine: boolean;
}

export interface ParsedOp {
  readonly op: string;
  readonly operands: ReadonlyArray<ParsedOperand>;
}

export function isParsedOp(input: string | unknown[] | ParsedOp): input is ParsedOp {
  return !Array.isArray(input) && typeof input !== 'string';
}

export interface ParsedOperand {
  readonly name: string;
  readonly type: OperandType;
}

export type ParsedType = ParsedAnyType | ParsedReference | ParsedRegister;

export interface Stack {
  readonly 0: ParsedType[];
  readonly 1: ParsedType[];
}

export class OpcodeMetadata {
  constructor(
    readonly desc: string,
    readonly mnemonic: ParsedMnemonic,
    readonly opcode: ParsedOp,
    readonly stack: Stack
  ) {}

  get isMachine(): boolean {
    return this.mnemonic.machine;
  }

  get name(): string {
    return this.opcode.op;
  }

  get short(): string {
    return this.mnemonic.shorthand;
  }

  toJSON() {
    return {
      desc: this.desc,
      mnemonic: this.mnemonic,
      opcode: this.opcode,
      stack: this.stack,
    };
  }
}

type Check<T> = (v: unknown) => v is T;

export const PREFIX: ParsedType = { type: '...', name: 'prefix' };

export interface ParsedFile {
  machine: Dict<OpcodeMetadata>;
  syscall: Dict<OpcodeMetadata>;
}

class Parser {
  private pos = 0;
  private readonly len: number;

  constructor(private input: string) {
    this.len = input.length;
  }

  protected get current(): number {
    return this.pos;
  }

  protected get rest(): string {
    return this.input.slice(this.pos);
  }

  protected get isEOF(): boolean {
    return this.len === this.pos;
  }

  protected slice(from: number, to: number): string {
    if (to < from) {
      throw new Error(`Unexpected end ${to} before start ${from}`);
    }
    return this.input.slice(from, to);
  }

  protected sliceN(from: number, size: number): string {
    return this.input.slice(from, from + size);
  }

  protected ws() {
    let matched = this.check(
      this.rest.match(/\s*/),
      (m => m !== null) as Check<[string]>,
      `Expected matched line, found ${JSON.stringify(this.rest)}`
    );

    this.pos += matched[0].length;
  }

  protected consume() {
    this.pos += 1;
  }

  protected peek(size: number): string {
    return this.rest.slice(0, size);
  }

  protected expect(next: string) {
    let { rest } = this;

    if (rest.startsWith(next)) {
      this.pos += next.length;
    } else {
      throw new Error(`Expected: ${JSON.stringify(next)}, found ${JSON.stringify(rest)}`);
    }
  }

  protected expectPeek(next: string) {
    let { rest } = this;

    if (rest.startsWith(next)) {
      return;
    } else {
      throw new Error(`Expected: ${JSON.stringify(next)}, found ${JSON.stringify(rest)}`);
    }
  }

  protected expectToken(next: ToToken): string {
    let token = toToken(next);
    let match = matchToken(this.input, this.pos, token);

    if (match === 0) {
      throw new Error(`Expected token ${token.describe()}. rest=${JSON.stringify(this.rest)}`);
    } else {
      // TODO: Add captures to tokens
      let result = this.sliceN(this.pos, match).replace(/^\*?/, '');
      this.pos += match;
      return result;
    }
  }

  protected consumeStringUntil(trail: ToToken, orEOF = true): string {
    let pre = this.current;
    this.consumeUntil(trail, orEOF);
    return this.slice(pre, this.current);
  }

  protected consumeUntil(trail: ToToken, orEOF = true): number {
    let result = this.scan(toToken(trail));

    if (result.eof && orEOF) {
      this.pos += result.prefix;
      return result.prefix;
    } else if (result.eof) {
      throw new Error(`Expected ${trail}, but found EOF first. rest=${JSON.stringify(this.rest)}`);
    } else {
      this.pos += result.prefix;
      return result.prefix;
    }
  }

  protected scan(
    token: Token
  ): { prefix: number; match: number; eof: false } | { prefix: number; eof: true } {
    let current = this.pos;

    while (true) {
      let match = matchToken(this.input, current, token);

      if (current === this.len) {
        return { prefix: current - this.pos, eof: true };
      }

      if (match) {
        return { prefix: current - this.pos, match, eof: false };
      } else {
        current += 1;
      }
    }
  }

  protected consumeLine(): string {
    let matched = this.check(
      this.rest.match(/(.*)(\n|$)/),
      (m => m !== null) as Check<[string, string]>,
      `Expected matched line, found ${JSON.stringify(this.rest)}`
    );

    this.pos += matched[0].length;

    return matched[1];
  }

  protected check<T>(v: unknown, pred: Check<T>, message: string): T {
    if (pred(v)) {
      return v;
    } else {
      throw new Error(`Expectation Failure: ${message}`);
    }
  }

  protected maybe(next: string): Option<string> {
    let { rest } = this;

    if (rest.startsWith(next)) {
      this.pos += next.length;
      return next;
    } else {
      return null;
    }
  }
}

export default class WholeOpcodeMetadataParser extends Parser {
  parse(): ParsedFile {
    let machine = {};
    let syscall = {};

    while (true) {
      let opcode = this.parseOpcode();

      if (opcode === null) {
        return { machine, syscall };
      } else if (opcode.isMachine) {
        machine[opcode.short] = opcode;
      } else {
        syscall[opcode.short] = opcode;
      }
    }
  }

  parseOpcode(): Option<OpcodeMetadata> {
    this.ws();

    if (this.isEOF) {
      return null;
    }

    let pre = this.current;
    this.expect('#');
    this.consumeUntil(literal('#'));
    let prefix = this.slice(pre, this.current);

    return new OpcodeMetadataParser(prefix).parse();
  }
}

const IDENT = token(any('A..Z', 'a..z'), repeat(any('A..Z', 'a..z', '0..9')));

export class OpcodeMetadataParser extends Parser {
  parse(): OpcodeMetadata {
    let mnemonic = this.readHeader();
    let op = this.readFormat();
    this.expect('Operation:');
    this.ws();
    let desc = this.readSectionUntil('Operand Stack:');
    this.ws();

    let stack = this.readStack();

    return new OpcodeMetadata(desc, mnemonic, op, stack);
  }

  private readSectionUntil(until: string) {
    let out = [];

    while (this.peek(until.length) !== until) {
      out.push(this.consumeLine().trim());
    }

    return out.join(' ').trim();
  }

  private readHeader(): ParsedMnemonic {
    this.expect('#');
    this.ws();

    let machine = false;

    if (this.peek(1) === '*') {
      machine = true;
      this.consume();
    }

    let shorthand = this.consumeLine().trim();
    this.ws();

    return { shorthand, machine };
  }

  private readFormat(): ParsedOp {
    this.expect('Format:');
    this.ws();

    this.expect('(');
    let op = this.expectToken(token(optional('*'), IDENT));

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
    let name = this.expectToken(IDENT);
    this.expect(':');
    let possibleType = this.expectToken(repeat(not(any(',', ')'))));
    let type = parseOperandType(possibleType); //(/^([^\s\),]*)/));
    this.maybe(',');
    this.ws();

    return { name, type };
  }

  private readStack(): Stack {
    this.expect('Operand Stack:');
    this.consumeLine();

    this.ws();

    let before = parseStackList(this.consumeStringUntil('→'));
    this.expect('→\n');
    let after = parseStackList(this.consumeLine());

    return [before, after];
  }
}

export function parseOperandType(type: string): OperandType {
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
