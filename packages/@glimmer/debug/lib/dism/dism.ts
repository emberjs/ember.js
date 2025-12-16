import type { Expand, Nullable } from '@glimmer/interfaces';

import type { NormalizedOperand } from './operand-types';

export type Primitive = undefined | null | boolean | number | string;
export type RegisterName =
  | '$pc'
  | '$ra'
  | '$fp'
  | '$sp'
  | '$s0'
  | '$s1'
  | '$t0'
  | '$t1'
  | '$v0'
  | `$bug${number}`;

export type StaticDisassembledOperand = ObjectForRaw<RawStaticDisassembledOperand> & {
  isDynamic: false;
};
export type DynamicDisassembledOperand = ObjectForRaw<RawDynamicDisassembledOperand> & {
  isDynamic: true;
};

export type SomeDisassembledOperand = StaticDisassembledOperand | DynamicDisassembledOperand;

export type RawDisassembledOperand = RawStaticDisassembledOperand | RawDynamicDisassembledOperand;

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
