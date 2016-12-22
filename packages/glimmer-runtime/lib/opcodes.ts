import { Opaque, Option, Dict, LinkedList, Slice, initializeGuid } from 'glimmer-util';
import { RevisionTag } from 'glimmer-reference';
import { VM, UpdatingVM } from './vm';

export interface OpcodeJSON {
  guid: Option<number>;
  type: string;
  deopted?: boolean;
  args?: string[];
  details?: Dict<Option<string>>;
  children?: OpcodeJSON[];
}

export function pretty(json: OpcodeJSON): string {
  return `${json.type.toUpperCase()}(${json.args ? json.args.join(', ') : ''})`;
}

export const enum OpcodeNames {

}

export type OpcodeToJSON = (data: AppendOpcodeData) => OpcodeJSON;
export type EvaluateOpcode = (data: AppendOpcodeData) => void;

export class AppendOpcodes {
  // TODO: prefill
  private opcodeToJSON: OpcodeToJSON[] = [];
  private evaluateOpcode: EvaluateOpcode[] = [];

  add(name: OpcodeNames, { toJSON, evaluate }: { toJSON: OpcodeToJSON, evaluate: EvaluateOpcode }) {
    this.opcodeToJSON[name] = toJSON;
    this.evaluateOpcode[name] = evaluate;
  }
}

export type AppendOpcodeData = [Opaque, Opaque, Opaque];

export interface AppendOpcode {
  type: OpcodeNames;
  data: [Opaque, Opaque, Opaque];
}

export abstract class AbstractOpcode {
  public type: string;
  public _guid: number;

  constructor() {
    initializeGuid(this);
  }

  toJSON(): OpcodeJSON {
    return { guid: this._guid, type: this.type };
  }
}

export abstract class Opcode extends AbstractOpcode {
  next: Option<Opcode> = null;
  prev: Option<Opcode> = null;

  abstract evaluate(vm: VM): void;
}

export type OpSeq = ReadonlyArray<Opcode>;
export type OpSeqBuilder = LinkedList<Opcode>;

export interface Slice {
  ops: OpSeq;
  start: number;
  end: number;
}

export abstract class UpdatingOpcode extends AbstractOpcode {
  public tag: RevisionTag;

  next: Option<UpdatingOpcode> = null;
  prev: Option<UpdatingOpcode> = null;

  abstract evaluate(vm: UpdatingVM): void;
}

export type UpdatingOpSeq = Slice<UpdatingOpcode>;

export function inspect(opcodes: ReadonlyArray<AbstractOpcode>): string {
  let buffer: string[] = [];

  opcodes.forEach((opcode, i) => {
    _inspect(opcode.toJSON(), buffer, 0, i);
  });

  return buffer.join('');
}

function _inspect(opcode: OpcodeJSON, buffer: string[], level: number, index: number) {
  let indentation: string[] = [];

  for (let i=0; i<level; i++) {
    indentation.push('  ');
  }

  buffer.push(...indentation);
  buffer.push(`${index}. ${opcode.type.toUpperCase()}`);

  if (opcode.args || opcode.details) {
    buffer.push('(');

    if (opcode.args) {
      buffer.push(opcode.args.join(', '));
    }

    if (opcode.details) {
      let keys = Object.keys(opcode.details);

      if (keys.length) {
        if (opcode.args && opcode.args.length) {
          buffer.push(', ');
        }

        buffer.push(keys.map(key => `${key}=${opcode.details && opcode.details[key]}`).join(', '));
      }
    }

    buffer.push(')');
  }

  buffer.push('\n');

  if (opcode.children && opcode.children.length) {
    for (let i=0; i<opcode.children.length; i++) {
      _inspect(opcode.children[i], buffer, level+1, i);
    }
  }
}
