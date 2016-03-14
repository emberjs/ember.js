import { LinkedList, LinkedListNode, Slice } from 'glimmer-util';
import { VM, UpdatingVM } from './vm';
import { Dict, initializeGuid } from 'glimmer-util';

export interface OpcodeJSON {
  guid: number;
  type: string;
  args?: string[];
  details?: Dict<string>;
  children?: OpcodeJSON[];
}

export abstract class UpdatingOpcode implements LinkedListNode {
  type: string;
  next: Opcode = null;
  prev: Opcode = null;

  public _guid: number;

  constructor() {
    initializeGuid(this);
  }

  abstract evaluate(vm: UpdatingVM);

  toJSON(): OpcodeJSON {
    return { guid: this._guid, type: this.type };
  }
}

export type UpdatingOpSeq = Slice<UpdatingOpcode>;

interface OpcodeFactory<T extends Opcode> {
  new(options: T): T;
}

export abstract class Opcode implements LinkedListNode {
  type: string;
  next: Opcode = null;
  prev: Opcode = null;

  public _guid: number;

  constructor() {
    initializeGuid(this);
  }

  abstract evaluate(vm: VM);

  toJSON(): OpcodeJSON {
    return { guid: this._guid, type: this.type };
  }
}

export type OpSeq = Slice<Opcode>;
export type OpSeqBuilder = LinkedList<Opcode>;
