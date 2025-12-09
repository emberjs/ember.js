import type {
  BlockMetadata,
  CompilationContext,
  Dict,
  Nullable,
  Optional,
  Program,
  ProgramConstants,
  RuntimeOp,
} from '@glimmer/interfaces';
import {
  CURRIED_COMPONENT,
  CURRIED_HELPER,
  CURRIED_MODIFIER,
  decodeHandle,
  decodeImmediate,
} from '@glimmer/constants';
import { exhausted, expect, unreachable } from '@glimmer/debug-util';
import { LOCAL_DEBUG, LOCAL_SUBTLE_LOGGING, LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';
import { enumerate, LOCAL_LOGGER } from '@glimmer/util';
import { $fp, $pc, $ra, $s0, $s1, $sp, $t0, $t1, $v0 } from '@glimmer/vm';

import type { Primitive, RegisterName } from './dism/dism';
import type { NormalizedOperand, OperandType, ShorthandOperand } from './dism/operand-types';

import { OPERANDS } from './dism/operands';
import { opcodeMetadata } from './opcode-metadata';
import { frag, type Fragment, as, type IntoFragment } from './render/fragment';
import { DebugLogger } from './render/logger';
import { SerializeBlockContext } from './dism/opcode';
import { join } from './render/basic';

export function describeOp(
  op: RuntimeOp,
  program: Program,
  meta: Nullable<BlockMetadata>
): Fragment {
  const { name, params } = debugOp(program, op, meta);

  const block = new SerializeBlockContext(meta?.symbols ?? null);

  let args: IntoFragment[] = Object.entries(params).map(
    ([p, v]) => frag`${as.attrName(p)}=${block.serialize(v)}`
  );

  return frag`(${join([as.kw(name), ...args], ' ')})`;
}

export function logOpcodeSlice(context: CompilationContext, start: number, end: number) {
  if (LOCAL_TRACE_LOGGING) {
    const logger = new DebugLogger(LOCAL_LOGGER, { showSubtle: !!LOCAL_SUBTLE_LOGGING });
    LOCAL_LOGGER.group(`%c${start}:${end}`, 'color: #999');

    const program = context.evaluation.program;

    let heap = program.heap;
    let opcode = context.evaluation.createOp(heap);

    let _size = 0;
    for (let i = start; i <= end; i = i + _size) {
      opcode.offset = i;
      const op = describeOp(opcode, program, context.meta);

      logger.log(frag`${i}. ${op}`);

      _size = opcode.size;
    }
    opcode.offset = -_size;
    LOCAL_LOGGER.groupEnd();
  }
}

export function describeOpcode(
  type: string,
  params: Optional<Dict<SomeDisassembledOperand>>
): string | void {
  if (LOCAL_DEBUG) {
    let out = type;

    if (params) {
      let args = Object.entries(params)
        .map(([p, v]) => ` ${p}=${jsonify(v)}`)
        .join('');
      out += args;
    }
    return `(${out})`;
  }
}

function stringify(value: number, type: 'constant' | 'variable' | 'pc'): string;
function stringify(value: RegisterName, type: 'register'): string;
function stringify(value: DisassembledOperand['value'], type: 'stringify' | 'unknown'): string;
function stringify(
  value: unknown,
  type: 'stringify' | 'constant' | 'register' | 'variable' | 'pc' | 'unknown'
) {
  switch (type) {
    case 'stringify':
      return JSON.stringify(value);
    case 'constant':
      return stringify(value, 'unknown');
    case 'register':
      return value;
    case 'variable':
      return `{$fp+${value}}`;
    case 'pc':
      return `@${value}`;
    case 'unknown': {
      switch (typeof value) {
        case 'function':
          return '<function>';
        case 'number':
        case 'string':
        case 'bigint':
        case 'boolean':
          return JSON.stringify(value);
        case 'symbol':
          return String(value);
        case 'undefined':
          return 'undefined';
        case 'object': {
          if (value === null) return 'null';
          if (Array.isArray(value)) return `<array[${value.length}]>`;

          let name = value.constructor.name;

          switch (name) {
            case 'Error':
            case 'RangeError':
            case 'ReferenceError':
            case 'SyntaxError':
            case 'TypeError':
            case 'WeakMap':
            case 'WeakSet':
              return `<${name}>`;
            case 'Object':
              return `<${name}>`;
          }

          if (value instanceof Map) {
            return `<Map[${value.size}]>`;
          } else if (value instanceof Set) {
            return `<Set[${value.size}]>`;
          } else {
            return `<${name}>`;
          }
        }
      }
    }
  }
}

function jsonify(param: SomeDisassembledOperand): string | string[] | null {
  const result = json(param);

  return Array.isArray(result) ? JSON.stringify(result) : (result ?? 'null');
}

function json(param: SomeDisassembledOperand): string | string[] | null {
  switch (param.type) {
    case 'number':
    case 'boolean':
    case 'string':
    case 'primitive':
      return stringify(param.value, 'stringify');
    case 'array':
      return '<array>';
    case 'dynamic':
      return stringify(param.value, 'unknown');
    case 'constant':
      return stringify(param.value, 'constant');
    case 'register':
      return stringify(param.value, 'register');
    case 'instruction':
      return stringify(param.value, 'pc');
    case 'variable':
      return stringify(param.value, 'variable');
    case 'error:opcode':
      return `{raw:${param.value}}`;
    case 'error:operand':
      return `{err:${param.options.label.name}=${param.value}}`;
    case 'enum<curry>':
      return `<curry:${param.value}>`;

    default:
      exhausted(param);
  }
}

export type AnyOperand = [type: string, value: never, options?: object];
export type OperandTypeOf<O extends AnyOperand> = O[0];
export type OperandValueOf<O extends AnyOperand> = O[1];
export type OperandOptionsOf<O extends AnyOperand> = O extends [
  type: string,
  value: never,
  options: infer Options,
]
  ? Options
  : void;
export type OperandOptionsA<O extends AnyOperand> = O extends [
  type: string,
  value: never,
  options: infer Options,
]
  ? Options
  : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {};

type ExtractA<O> = O extends { a: infer A } ? A : never;
type ExpandUnion<U> = U extends infer O ? ExtractA<{ a: O }> : never;

export type NullableOperand<O extends AnyOperand> =
  | [OperandTypeOf<O>, OperandValueOf<O>, Expand<OperandOptionsA<O> & { nullable?: false }>]
  | [
      OperandTypeOf<O>,
      Nullable<OperandValueOf<O>>,
      Expand<OperandOptionsA<O> & { nullable: true }>,
    ];

export type NullableName<T extends string> = T extends `${infer N}?` ? N : never;

export type WithOptions<O extends AnyOperand, Options> = ExpandUnion<
  [OperandTypeOf<O>, OperandValueOf<O>, Expand<OperandOptionsA<O> & Options>]
>;

// expands object types one level deep
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type DefineOperand<T extends string, V, Options = undefined> = undefined extends Options
  ? readonly [type: T, value: V]
  : readonly [type: T, value: V, options: Options];

type DefineNullableOperand<T extends string, V, Options = undefined> = Options extends undefined
  ?
      | readonly [type: T, value: V]
      | readonly [type: T, value: Nullable<V>, options: { nullable: true }]
      | readonly [type: T, value: V, options: { nullable?: false }]
  :
      | readonly [type: T, value: Nullable<V>, options: Expand<Options & { nullable: true }>]
      | readonly [type: T, value: V, options: Expand<Options & { nullable?: false }>]
      | readonly [type: T, value: V, options: Options];

/**
 * A dynamic operand has a value that can't be easily represented as an embedded string.
 */
export type RawDynamicDisassembledOperand =
  | DefineOperand<'dynamic', unknown>
  | DefineOperand<'constant', number>
  | DefineNullableOperand<'array', unknown[]>
  | DefineOperand<'variable', number, { name?: string | null }>;

export type RawStaticDisassembledOperand =
  | DefineOperand<'error:operand', number, { label: NormalizedOperand }>
  | DefineOperand<'error:opcode', number, { kind: number }>
  | DefineOperand<'number', number>
  | DefineOperand<'boolean', boolean>
  | DefineOperand<'primitive', Primitive>
  | DefineOperand<'register', RegisterName>
  | DefineOperand<'instruction', number>
  | DefineOperand<'enum<curry>', 'component' | 'helper' | 'modifier'>
  | DefineOperand<'array', number[], { kind: typeof Number }>
  | DefineNullableOperand<'array', string[], { kind: typeof String }>
  /**
   * A variable is a numeric offset into the stack (relative to the $fp register).
   */
  | DefineNullableOperand<'string', string>;

export type RawDisassembledOperand = RawStaticDisassembledOperand | RawDynamicDisassembledOperand;

type ObjectForRaw<R> = R extends RawDisassembledOperand
  ? R[2] extends undefined
    ? {
        type: R[0];
        value: R[1];
        options?: R[2];
      }
    : {
        type: R[0];
        value: R[1];
        options: R[2];
      }
  : never;

export class DisassembledOperand<R extends RawDisassembledOperand = RawDisassembledOperand> {
  static of(raw: RawDisassembledOperand): SomeDisassembledOperand {
    return new DisassembledOperand(raw) as never;
  }

  readonly #raw: R;

  private constructor(raw: R) {
    this.#raw = raw;
  }

  get type(): R[0] {
    return this.#raw[0];
  }

  get value(): R[1] {
    return this.#raw[1];
  }

  get options(): R[2] {
    return this.#raw[2];
  }
}

export type StaticDisassembledOperand = ObjectForRaw<RawStaticDisassembledOperand> & {
  isDynamic: false;
};
export type DynamicDisassembledOperand = ObjectForRaw<RawDynamicDisassembledOperand> & {
  isDynamic: true;
};

export type SomeDisassembledOperand = StaticDisassembledOperand | DynamicDisassembledOperand;

export interface DebugOp {
  name: string;
  params: Dict<SomeDisassembledOperand>;
  meta: BlockMetadata | null;
}

export type OpSnapshot = Pick<RuntimeOp, 'offset' | 'size' | 'type' | 'op1' | 'op2' | 'op3'>;

export function getOpSnapshot(op: RuntimeOp): OpSnapshot {
  return {
    offset: op.offset,
    size: op.size,
    type: op.type,
    op1: op.op1,
    op2: op.op2,
    op3: op.op3,
  };
}

class DebugOperandInfo {
  readonly #offset: number;
  readonly #operand: NormalizedOperand;
  readonly #value: number;
  readonly #program: Program;
  readonly #metadata: BlockMetadata | null;

  constructor(
    offset: number,
    operand: NormalizedOperand,
    value: number,
    program: Program,
    metadata: BlockMetadata | null
  ) {
    this.#offset = offset;
    this.#operand = operand;
    this.#value = value;
    this.#program = program;
    this.#metadata = metadata;
  }

  toDebug(): RawDisassembledOperand {
    const spec = expect(
      OPERANDS[this.#operand.type],
      `Unknown operand type: ${this.#operand.type}`
    );

    return spec({
      offset: this.#offset,
      label: this.#operand,
      value: this.#value,
      constants: this.#program.constants,
      heap: this.#program.heap,
      meta: this.#metadata,
    });
  }
}

export function debugOp(program: Program, op: OpSnapshot, meta: BlockMetadata | null): DebugOp {
  if (LOCAL_DEBUG) {
    let metadata = opcodeMetadata(op.type);

    let out = Object.create(null) as Dict<RawDisassembledOperand>;
    if (!metadata) {
      for (let i = 0; i < op.size; i++) {
        out[i] = ['error:opcode', i, { kind: op.type }];
      }

      return { name: `{unknown ${op.type}}`, params: fromRaw(out), meta };
    } else if (metadata.ops) {
      for (const [index, operand] of enumerate(metadata.ops)) {
        const normalized = normalizeOperand(operand);
        const info = new DebugOperandInfo(
          op.offset,
          normalized,
          getOperand(op, index as 0 | 1 | 2),
          program,
          meta
        );
        out[normalized.name] = info.toDebug();
      }
    }
    return { name: metadata.name, params: fromRaw(out), meta };
  }

  unreachable(`BUG: Don't try to debug opcodes while trace is disabled`);
}

function normalizeOperand(operand: ShorthandOperand): NormalizedOperand {
  const [name, type] = operand.split(':') as [string, OperandType];
  return { name, type };
}

function getOperand(op: OpSnapshot, index: 0 | 1 | 2): number {
  switch (index) {
    case 0:
      return op.op1;
    case 1:
      return op.op2;
    case 2:
      return op.op3;
  }
}

function fromRaw(operands: Dict<RawDisassembledOperand>): Dict<SomeDisassembledOperand> {
  return Object.fromEntries(
    Object.entries(operands).map(([name, raw]) => [name, DisassembledOperand.of(raw)])
  );
}
