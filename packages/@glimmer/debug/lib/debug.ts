import {
  CompileTimeConstants,
  Recast,
  RuntimeOp,
  Dict,
  Maybe,
  TemplateCompilationContext,
} from '@glimmer/interfaces';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { RuntimeOpImpl } from '@glimmer/program';
import { Register, $s0, $s1, $t0, $t1, $v0, $fp, $sp, $pc, $ra } from '@glimmer/vm';
import { decodeImmediate, decodeHandle, LOCAL_LOGGER } from '@glimmer/util';
import { opcodeMetadata } from './opcode-metadata';
import { Primitive } from './stack-check';

export interface DebugConstants {
  getValue<T>(handle: number): T;
  getArray<T>(value: number): T[];
  getSerializable(s: number): unknown;
}

interface LazyDebugConstants {
  getOther<T>(s: number): T;
}

export function debugSlice(context: TemplateCompilationContext, start: number, end: number) {
  if (LOCAL_SHOULD_LOG) {
    LOCAL_LOGGER.group(`%c${start}:${end}`, 'color: #999');

    let heap = context.program.heap;
    let opcode = new RuntimeOpImpl(heap);

    let _size = 0;
    for (let i = start; i < end; i = i + _size) {
      opcode.offset = i;
      let [name, params] = debug(
        context.program.constants as Recast<CompileTimeConstants, DebugConstants>,
        opcode,
        opcode.isMachine
      )!;
      LOCAL_LOGGER.log(`${i}. ${logOpcode(name, params)}`);
      _size = opcode.size;
    }
    opcode.offset = -_size;
    LOCAL_LOGGER.groupEnd();
  }
}

export function logOpcode(type: string, params: Maybe<Dict>): string | void {
  if (LOCAL_SHOULD_LOG) {
    let out = type;

    if (params) {
      let args = Object.keys(params)
        .map((p) => ` ${p}=${json(params[p])}`)
        .join('');
      out += args;
    }
    return `(${out})`;
  }
}

function json(param: unknown) {
  if (LOCAL_SHOULD_LOG) {
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

export function debug(
  c: DebugConstants,
  op: RuntimeOp,
  isMachine: 0 | 1
): [string, Dict] | undefined {
  if (LOCAL_SHOULD_LOG) {
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
        case 'owner':
          out[operand.name] = actualOperand;
          break;
        case 'handle':
          out[operand.name] = c.getValue(actualOperand);
          break;
        case 'str':
        case 'option-str':
        case 'array':
          out[operand.name] = c.getValue(actualOperand);
          break;
        case 'str-array':
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

  return undefined;
}

function opcodeOperand(opcode: RuntimeOp, index: number): number {
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
  if (primitive >= 0) {
    return constants.getValue(decodeHandle(primitive));
  }
  return decodeImmediate(primitive);
}
