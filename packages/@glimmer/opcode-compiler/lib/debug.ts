import { CompileTimeProgram, CompileTimeConstants } from './interfaces';
import { Option, Opaque, SymbolTable, Recast } from '@glimmer/interfaces';
import { METADATA, Op, Register } from '@glimmer/vm';
import { DEBUG } from '@glimmer/local-debug-flags';
import { unreachable, dict } from "@glimmer/util";
import { Primitive } from "@glimmer/debug";
import { PrimitiveType } from "@glimmer/program";

export interface DebugConstants {
  getFloat(value: number): number;
  getNegative(value: number): number;
  getString(value: number): string;
  getStringArray(value: number): string[];
  getArray(value: number): number[];
  getSymbolTable<T extends SymbolTable>(value: number): T;
  getSerializable<T>(s: number): T;
  resolveHandle<T>(s: number): T;
}

interface LazyDebugConstants {
  getOther<T>(s: number): T;
}

export function debugSlice(program: CompileTimeProgram, start: number, end: number) {
  if (DEBUG) {
    /* tslint:disable:no-console */
    let { constants } = program;

    // console is not available in IE9
    if (typeof console === 'undefined') { return; }

    // IE10 does not have `console.group`
    if (typeof console.group !== 'function') { return; }

    (console as any).group(`%c${start}:${end}`, 'color: #999');

    let _size = 0;
    for (let i=start; i<end; i = i + _size) {
      let { type, op1, op2, op3, size } = program.opcode(i);
      let [name, params] = debug(constants as Recast<CompileTimeConstants, DebugConstants>, type, op1, op2, op3);
      console.log(`${i}. ${logOpcode(name, params)}`);
      _size = size;
    }

    console.groupEnd();
    /* tslint:enable:no-console */
  }
}

export function logOpcode(type: string, params: Option<Object>): string | void {
  let out = type;

  if (params) {
    let args = Object.keys(params).map(p => ` ${p}=${json(params[p])}`).join('');
    out += args;
  }
  return `(${out})`;
}

function json(param: Opaque) {
  if (DEBUG) {
    if (typeof param === 'function') {
      return '<function>';
    }

    let string;
    try {
      string = JSON.stringify(param);
    } catch(e) {
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

export function debug(c: DebugConstants, op: Op, ...operands: number[]): [string, object] {
  let metadata = METADATA[op];

  if (!metadata) {
    throw unreachable(`Missing Opcode Metadata for ${op}`);
  }

  let out = dict<Opaque>();

  metadata.ops.forEach((operand, index) => {
    let op = operands[index];

    switch (operand.type) {
      case 'i32':
      case 'symbol':
      case 'block':
        out[operand.name] = op;
        break;
      case 'handle':
        out[operand.name] = c.resolveHandle(op);
        break;
      case 'str':
        out[operand.name] = c.getString(op);
        break;
      case 'option-str':
        out[operand.name] = op ? c.getString(op) : null;
        break;
      case 'str-array':
        out[operand.name] = c.getStringArray(op);
        break;
      case 'array':
        out[operand.name] = c.getArray(op);
        break;
      case 'bool':
        out[operand.name] = !!op;
        break;
      case 'primitive':
        out[operand.name] = decodePrimitive(op, c);
        break;
      case 'register':
        out[operand.name] = Register[op];
        break;
      case 'table':
        out[operand.name] = c.getSymbolTable(op);
        break;
      case 'serializable':
        out[operand.name] = c.getSerializable(op);
        break;
      case 'lazy-constant':
        out[operand.name] = (c as Recast<DebugConstants, LazyDebugConstants>).getOther(op);
        break;
    }
  });

  return [metadata.name, out];
}

function decodePrimitive(primitive: number, constants: DebugConstants): Primitive {
  let flag = primitive & 7; // 111
  let value = primitive >> 3;

  switch (flag) {
    case PrimitiveType.NUMBER:
      return value;
    case PrimitiveType.FLOAT:
      return constants.getFloat(value);
    case PrimitiveType.STRING:
      return constants.getString(value);
    case PrimitiveType.BOOLEAN_OR_VOID:
      switch (value) {
        case 0: return false;
        case 1: return true;
        case 2: return null;
        case 3: return undefined;
      }
    case PrimitiveType.NEGATIVE:
      return constants.getNegative(value);
    default:
      throw unreachable();
  }
}
