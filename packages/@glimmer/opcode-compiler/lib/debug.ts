import {
  CompileTimeConstants,
  Recast,
  RuntimeOp,
  PrimitiveType,
  HandleResolver,
  Dict,
  Maybe,
  TemplateCompilationContext,
  TemplateMeta,
} from '@glimmer/interfaces';
import { opcodeMetadata, Register, $s0, $s1, $t0, $t1, $v0, $fp, $sp, $pc, $ra } from '@glimmer/vm';
import { DEBUG } from '@glimmer/local-debug-flags';
import { Primitive } from '@glimmer/debug';
import { RuntimeOpImpl } from '@glimmer/program';

export interface DebugConstants {
  getNumber(value: number): number;
  getString(value: number): string;
  getStringArray(value: number): string[];
  getArray(value: number): number[];
  getTemplateMeta(s: number): TemplateMeta;
}

interface LazyDebugConstants {
  getOther<T>(s: number): T;
}

export function debugSlice(context: TemplateCompilationContext, start: number, end: number) {
  if (DEBUG) {
    /* tslint:disable:no-console */

    (console as any).group(`%c${start}:${end}`, 'color: #999');

    let heap = context.syntax.program.heap;
    let opcode = new RuntimeOpImpl(heap);

    let _size = 0;
    for (let i = start; i < end; i = i + _size) {
      opcode.offset = i;
      let [name, params] = debug(
        context.syntax.program.constants as Recast<CompileTimeConstants, DebugConstants>,
        context.syntax.program.resolverDelegate,
        opcode,
        opcode.isMachine
      );
      console.log(`${i}. ${logOpcode(name, params)}`);
      _size = opcode.size;
    }
    opcode.offset = -_size;
    console.groupEnd();
    /* tslint:enable:no-console */
  }
}

export function logOpcode(type: string, params: Maybe<Dict>): string | void {
  let out = type;

  if (params) {
    let args = Object.keys(params)
      .map(p => ` ${p}=${json(params[p])}`)
      .join('');
    out += args;
  }
  return `(${out})`;
}

function json(param: unknown) {
  if (DEBUG) {
    if (typeof param === 'function') {
      return '<function>';
    }

    let string;
    try {
      string = JSON.stringify(param);
    } catch (e) {
      return '<object>';
    }

    if (string === undefined) {
      return 'undefined';
    }

    let debug = JSON.parse(string);
    if (typeof debug === 'object' && debug !== null && debug.GlimmerDebug !== undefined) {
      return debug.GlimmerDebug;
    }

    return string;
  }
}

export function opcodeOperand(opcode: RuntimeOp, index: number): number {
  switch (index) {
    case 0:
      return opcode.op1;
    case 1:
      return opcode.op2;
    case 2:
      return opcode.op3;
    default:
      throw new Error(`Unexpected operand index (must be 0-2)`);
  }
}

export function debug(
  c: DebugConstants,
  resolver: HandleResolver,
  op: RuntimeOp,
  isMachine: 0 | 1
): [string, object] {
  let metadata = opcodeMetadata(op.type, isMachine);

  if (!metadata) {
    throw new Error(`Missing Opcode Metadata for ${op}`);
  }

  let out = Object.create(null);

  metadata.ops.forEach((operand, index: number) => {
    let actualOperand = opcodeOperand(op, index);

    switch (operand.type) {
      case 'u32':
      case 'i32':
      case 'meta':
        out[operand.name] = actualOperand;
        break;
      case 'handle':
        out[operand.name] = resolver.resolve(actualOperand);
        break;
      case 'str':
        out[operand.name] = c.getString(actualOperand);
        break;
      case 'option-str':
        out[operand.name] = actualOperand ? c.getString(actualOperand) : null;
        break;
      case 'str-array':
        out[operand.name] = c.getStringArray(actualOperand);
        break;
      case 'array':
        out[operand.name] = c.getArray(actualOperand);
        break;
      case 'bool':
        out[operand.name] = !!actualOperand;
        break;
      case 'primitive':
        out[operand.name] = decodePrimitive(actualOperand, c);
        break;
      case 'register':
        out[operand.name] = decodeRegister(actualOperand);
        break;
      case 'unknown':
        out[operand.name] = (c as Recast<DebugConstants, LazyDebugConstants>).getOther(
          actualOperand
        );
        break;
      case 'symbol-table':
      case 'scope':
        out[operand.name] = `<scope ${actualOperand}>`;
        break;
      default:
        throw new Error(`Unexpected operand type ${operand.type} for debug output`);
    }
  });

  return [metadata.name, out];
}

function decodeRegister(register: Register): string {
  switch (register) {
    case $pc:
      return 'pc';
    case $ra:
      return 'ra';
    case $fp:
      return 'fp';
    case $sp:
      return 'sp';
    case $s0:
      return 's0';
    case $s1:
      return 's1';
    case $t0:
      return 't0';
    case $t1:
      return 't1';
    case $v0:
      return 'v0';
  }
}

function decodePrimitive(primitive: number, constants: DebugConstants): Primitive {
  let flag = primitive & 7; // 111
  let value = primitive >> 3;

  switch (flag) {
    case PrimitiveType.NUMBER:
      return value;
    case PrimitiveType.FLOAT:
      return constants.getNumber(value);
    case PrimitiveType.STRING:
      return constants.getString(value);
    case PrimitiveType.BOOLEAN_OR_VOID:
      switch (value) {
        case 0:
          return false;
        case 1:
          return true;
        case 2:
          return null;
        case 3:
          return undefined;
      }
    case PrimitiveType.NEGATIVE:
    case PrimitiveType.BIG_NUM:
      return constants.getNumber(value);
    default:
      throw new Error('unreachable');
  }
}
