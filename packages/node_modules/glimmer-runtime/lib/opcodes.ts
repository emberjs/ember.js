import { LinkedList, LinkedListNode, CloneableListNode, Slice } from 'glimmer-util';
import { VM, UpdatingVM } from './vm';

export interface UpdatingOpcode extends LinkedListNode {
  type: string;
  next: Opcode;
  prev: Opcode;

  evaluate(vm: UpdatingVM);
}

export type UpdatingOpSeq = Slice<UpdatingOpcode>;

interface OpcodeFactory<T extends Opcode> {
  new(options: T): T;
}

export abstract class Opcode implements LinkedListNode, CloneableListNode {
  type: string;
  next: Opcode = null;
  prev: Opcode = null;

  abstract evaluate(vm: VM);

  clone(): this {
    let constructor: OpcodeFactory<this> = this.constructor as OpcodeFactory<this>;
    return new constructor(this);
  }
}

export type OpSeq = Slice<Opcode>;
export type OpSeqBuilder = LinkedList<Opcode>;
