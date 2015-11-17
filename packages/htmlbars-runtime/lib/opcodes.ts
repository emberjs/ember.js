import { Dict, LinkedList, LinkedListNode } from 'htmlbars-util';
import { ChainableReference, PathReference } from 'htmlbars-reference';
import Template from './template';
import { Frame, Environment } from './environment';
import { ElementStack } from './builder';
import { Morph } from './morph';
import { VM, UpdatingVM } from './vm';
import DOMHelper from './dom';

export type PrettyPrintValue = PrettyPrint | PrettyPrint[] | string | string[];

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

  abstract compile(opcodes: LinkedList<Opcode>, env: Environment<any>);
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

export type UpdatingOpSeq = LinkedList<UpdatingOpcode>;

export interface Opcode extends LinkedListNode {
  type: string;
  next: Opcode;
  prev: Opcode;

  evaluate(vm: VM<any>);
}

export type OpSeq = LinkedList<Opcode>;