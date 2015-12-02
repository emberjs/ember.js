import { Dict, LinkedList, LinkedListNode, ListNode, Slice } from 'glimmer-util';
import { ChainableReference, PathReference } from 'glimmer-reference';
import Template, { Compiler } from './template';
import { Frame, Environment } from './environment';
import { ElementStack } from './builder';
import { Morph } from './morph';
import { VM, UpdatingVM } from './vm';
import DOMHelper from './dom';

export type PrettyPrintValue = PrettyPrint | string | string[] | PrettyPrintValueArray | PrettyPrintValueDict;

interface PrettyPrintValueArray extends Array<PrettyPrintValue> {

}

interface PrettyPrintValueDict extends Dict<PrettyPrintValue> {

}

export class PrettyPrint {
  type: string;
  operation: string;
  params: PrettyPrintValue[];
  hash: Dict<PrettyPrintValue>;
  templates: Dict<number>;

  constructor(type: string, operation: string, params: PrettyPrintValue[]=null, hash: Dict<PrettyPrintValue>=null, templates: Dict<number>=null) {
    this.type = type;
    this.operation = operation;
    this.params = params;
    this.hash = hash;
    this.templates = templates;
  }
}

export interface PrettyPrintable {
  prettyPrint(): PrettyPrint;
}

abstract class Syntax<T extends LinkedListNode> implements LinkedListNode {
  static fromSpec(spec: any, templates: Template[]): Syntax<any> {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  public type: string;
  public next: T = null;
  public prev: T = null;

  prettyPrint(): PrettyPrintValue {
    return `<${this.type}>`;
  }
}

export abstract class StatementSyntax extends Syntax<StatementSyntax> {
  static fromSpec(spec: any, templates: Template[]): StatementSyntax {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  prettyPrint(): PrettyPrint {
    return new PrettyPrint(this.type, this.type);
  }

  clone(): this {
    // not type safe but the alternative is extreme boilerplate per
    // syntax subclass.
    return new (<new (any) => any>this.constructor)(this);
  }

  abstract compile(opcodes: Compiler, env: Environment<any>);
}

export abstract class ExpressionSyntax extends Syntax<ExpressionSyntax> {
  public type: string;

  prettyPrint(): PrettyPrintValue {
    return `${this.type}`
  }

  abstract evaluate(frame: Frame): PathReference;
}

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

  abstract evaluate(vm: VM<any>);
}

export type OpSeq = Slice<Opcode>;
export type OpSeqBuilder = LinkedList<Opcode>;
