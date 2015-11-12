import { Dict, LinkedList, LinkedListNode } from 'htmlbars-util';
import { ChainableReference } from 'htmlbars-reference';
import Template from './template';
import { Frame } from './environment';
import { ElementStack } from './builder';
import { Morph } from './morph';
import { VM } from './vm';

export type PrettyPrintValue = PrettyPrint | string;

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

export interface ExpressionSyntax {
  type: string;
  isStatic: boolean;
  evaluate(frame: Frame): ChainableReference;
  prettyPrint(): any;
}

abstract class Syntax<T extends LinkedListNode> implements LinkedListNode {
  static fromSpec(spec: any, templates: Template[]): Syntax<any> {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  public next: T = null;
  public prev: T = null;

  abstract clone(): T;
}

export abstract class StatementSyntax extends Syntax<StatementSyntax> {
  static fromSpec(spec: any, templates: Template[]): StatementSyntax {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  abstract evaluate(stack: ElementStack, frame: Frame, vm: VM<any>): Morph;

  public type: string;
  public isStatic: boolean;
  public next: StatementSyntax = null;
  public prev: StatementSyntax = null;

  abstract clone(): StatementSyntax;

  inline(): LinkedList<StatementSyntax> {
    return null;
  }
}

export abstract class StaticStatementSyntax extends StatementSyntax implements PrettyPrintable {
  abstract prettyPrint(): PrettyPrint;
}

export abstract class DynamicStatementSyntax extends StatementSyntax {
}

export abstract class StaticExpression extends Syntax<StaticExpression> {
  public isStatic: boolean = true;
}

export abstract class DynamicExpression extends Syntax<DynamicExpression> {
  public isStatic: boolean = false;
}
