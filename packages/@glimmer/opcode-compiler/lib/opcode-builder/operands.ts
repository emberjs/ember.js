import {
  ArgsOperand,
  ArgsOptions,
  ArrayOperand,
  CompileActions,
  ExpressionOperand,
  LabelOperand,
  LookupHandleOperand,
  Option,
  OptionOperand,
  OtherOperand,
  PrimitiveOperand,
  SerializableOperand,
  StringArrayOperand,
  TemplateMetaOperand,
  WireFormat,
  PrimitiveType,
  PrimitiveOperandValue,
  PrimitiveOperandNumberValue,
  PrimitiveOperandStringValue,
  PrimitiveOperandImmediateValue,
} from '@glimmer/interfaces';

export function arr(value: number[]): ArrayOperand {
  return {
    type: 'array',
    value,
  };
}

export function strArray(value: string[]): StringArrayOperand {
  return {
    type: 'string-array',
    value,
  };
}

export function serializable(value: unknown): SerializableOperand {
  return { type: 'serializable', value };
}

export function templateMeta(value: unknown): TemplateMetaOperand {
  return { type: 'template-meta', value };
}

export function other(value: unknown): OtherOperand {
  return { type: 'other', value };
}

export function label(value: string): LabelOperand {
  return { type: 'label', value };
}

export function args(options: ArgsOptions): ArgsOperand {
  return { type: 'args', value: options };
}

export function option(list: Option<CompileActions>): OptionOperand {
  return { type: 'option', value: list };
}

export function expression(expr: WireFormat.Expression): ExpressionOperand {
  return { type: 'expr', value: expr };
}

export function lookup(kind: 'helper', value: string): LookupHandleOperand {
  return { type: 'lookup', value: { kind, value } };
}

export function prim(
  operand: string,
  type: PrimitiveType.STRING
): PrimitiveOperand<PrimitiveOperandStringValue>;
export function prim(
  operand: number,
  type: PrimitiveType.NUMBER
): PrimitiveOperand<PrimitiveOperandNumberValue>;
export function prim(
  operand: number | boolean | null | undefined,
  type: PrimitiveType.IMMEDIATE
): PrimitiveOperand<PrimitiveOperandImmediateValue>;
export function prim(
  operand: string | number | boolean | null | undefined,
  type: PrimitiveType
): PrimitiveOperand {
  return {
    type: 'primitive',
    value: {
      primitive: operand,
      type,
    } as PrimitiveOperandValue,
  };
}
