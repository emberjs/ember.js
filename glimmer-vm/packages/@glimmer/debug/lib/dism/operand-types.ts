// @note OPERAND_TYPES
export const OPERAND_TYPES = [
  // imm means inline
  'imm/u32',
  'imm/i32',
  // encoded as 0 or 1
  'imm/bool',
  // the operand is an i32 or u32, but it has a more specific meaning that should be captured here
  'imm/u32{todo}',
  'imm/i32{todo}',

  'imm/enum<curry>',
  'imm/block:handle',

  'imm/pc',
  'handle',
  'handle/block',

  'const/i32[]',
  'const/str?',
  'const/any[]',
  'const/str[]?',
  'const/bool',
  'const/fn',
  'const/any',

  // could be an immediate
  'const/primitive',
  'const/definition',

  'register',
  // $pc, $ra
  'register/instruction',
  // $sp, $fp
  'register/stack',
  // $s0, $s1, $t0, $t1, $v0
  'register/sN',
  'register/tN',
  'register/v0',

  'variable',

  'instruction/relative',
] as const;

export function isOperandType(s: string): s is OperandType {
  return OPERAND_TYPES.includes(s as never) || OPERAND_TYPES.includes(`${s}?` as never);
}

export type OPERAND_TYPE = (typeof OPERAND_TYPES)[number];
export type NonNullableOperandType = Exclude<OPERAND_TYPE, `${string}?`>;
export type NullableOperandType =
  Extract<OPERAND_TYPE, `${string}?`> extends `${infer S}?` ? S : never;
export type OperandType = NonNullableOperandType | NullableOperandType | `${NullableOperandType}?`;

export interface NormalizedOperand {
  type: OperandType;
  name: string;
}

export type NormalizedOperandList =
  | []
  | [NormalizedOperand]
  | [NormalizedOperand, NormalizedOperand]
  | [NormalizedOperand, NormalizedOperand, NormalizedOperand];

export type ShorthandOperandList =
  | []
  | [ShorthandOperand]
  | [ShorthandOperand, ShorthandOperand]
  | [ShorthandOperand, ShorthandOperand, ShorthandOperand];

export type ShorthandOperand = `${string}:${OperandType}`;
