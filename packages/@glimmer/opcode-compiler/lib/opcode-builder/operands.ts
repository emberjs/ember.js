import {
  ArgsOperand,
  ArgsOptions,
  ArrayOperand,
  CompileActions,
  ExpressionOperand,
  LabelOperand,
  LookupHandleOperand,
  NumberOperand,
  Option,
  OptionOperand,
  OtherOperand,
  PrimitiveOperand,
  PrimitiveType,
  SerializableOperand,
  StringArrayOperand,
  WireFormat,
  NonlabelBuilderOperand,
} from '@glimmer/interfaces';

export function num(value: number): NumberOperand {
  return { type: 'number', value };
}

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

export function prim(operand: NonlabelBuilderOperand, type: PrimitiveType): PrimitiveOperand {
  return { type: 'primitive', value: { primitive: operand, type } };
}
