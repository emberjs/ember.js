import { Dict, LinkedList, LinkedListNode, Slice, initializeGuid } from 'glimmer-util';
import { RevisionTag } from 'glimmer-reference';
import { VM, UpdatingVM } from './vm';

export interface OpcodeJSON {
  guid: number;
  type: string;
  args?: string[];
  details?: Dict<string>;
  children?: OpcodeJSON[];
}

export abstract class AbstractOpcode implements LinkedListNode {
  public type: string;
  public _guid: number;

  prev: AbstractOpcode;
  next: AbstractOpcode;

  constructor() {
    initializeGuid(this);
  }

  toJSON(): OpcodeJSON {
    return { guid: this._guid, type: this.type };
  }
}

export abstract class Opcode extends AbstractOpcode {
  next: Opcode = null;
  prev: Opcode = null;

  abstract evaluate(vm: VM);
}

export type OpSeq = Slice<Opcode>;
export type OpSeqBuilder = LinkedList<Opcode>;

export abstract class UpdatingOpcode extends AbstractOpcode {
  public tag: RevisionTag;

  next: UpdatingOpcode = null;
  prev: UpdatingOpcode = null;

  abstract evaluate(vm: UpdatingVM);
}

export type UpdatingOpSeq = Slice<UpdatingOpcode>;

interface OpcodeFactory<T extends Opcode> {
  new(options: T): T;
}

export function inspect(opcodes: LinkedList<AbstractOpcode>): string {
  let buffer = [];

  opcodes.toArray().forEach((opcode, i) => {
    _inspect(opcode.toJSON(), buffer, 0, i);
  });

  return buffer.join('');
}

function _inspect(opcode: OpcodeJSON, buffer: string[], level: number, index: number) {
  let indentation = [];

  for (let i=0; i<level; i++) {
    indentation.push('  ');
  }

  buffer.push(...indentation);
  buffer.push(`${index+1}. ${opcode.type.toUpperCase()}`);

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

        buffer.push(keys.map(key => `${key}=${opcode.details[key]}`).join(', '));
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
