import { Dict, LinkedList, LinkedListNode, ListNode, Slice } from 'glimmer-util';
import { ChainableReference, PathReference } from 'glimmer-reference';
import Template from './template';
import Compiler from './compiler';
import Environment from './environment';
import { ElementStack } from './builder';
import { VM, UpdatingVM } from './vm';
import DOMHelper from './dom';

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
