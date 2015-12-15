import { LinkedList, LinkedListNode, Slice, Dict } from 'glimmer-util';
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

export abstract class UnflattenedOpcode extends Opcode {
  abstract flatten(list: Opcode[], labels: Dict<number>);

  evaluate() {
    throw new Error("Unreachable");
  }
}

export type OpSeq = Slice<Opcode>;
export type OpSeqBuilder = LinkedList<Opcode>;
