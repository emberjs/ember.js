import { LinkedList, LinkedListNode, Slice } from 'glimmer-util';
import { VM, UpdatingVM } from './vm';

export interface UpdatingOpcode extends LinkedListNode {
  type: string;
  next: Opcode;
  prev: Opcode;

  evaluate(vm: UpdatingVM);
}

export type UpdatingOpSeq = Slice<UpdatingOpcode>;

export abstract class Opcode implements LinkedListNode {
  type: string;
  next: Opcode = null;
  prev: Opcode = null;

  abstract evaluate(vm: VM);
}

export type OpSeq = Slice<Opcode>;
export type OpSeqBuilder = LinkedList<Opcode>;
