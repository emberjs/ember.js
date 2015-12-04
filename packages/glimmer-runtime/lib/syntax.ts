import { Dict, LinkedListNode, Slice } from 'glimmer-util';
import Template from './template';
import Compiler from './compiler';
import { Environment } from './environment';
import { CompiledExpression } from './compiled/expressions';

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

export default Syntax;

export abstract class StatementSyntax extends Syntax<StatementSyntax> {
  static fromSpec(spec: any, templates: Template[]): StatementSyntax {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  prettyPrint(): any {
    return new PrettyPrint(this.type, this.type);
  }

  clone(): this {
    // not type safe but the alternative is extreme boilerplate per
    // syntax subclass.
    return new (<new (any) => any>this.constructor)(this);
  }

  abstract compile(opcodes: Compiler, env: Environment);
}

export type Program = Slice<StatementSyntax>;

export const ATTRIBUTE_SYNTAX = "e1185d30-7cac-4b12-b26a-35327d905d92";

export abstract class AttributeSyntax extends StatementSyntax {
  "e1185d30-7cac-4b12-b26a-35327d905d92": boolean;
  name: string;
  namespace: string;
  abstract valueSyntax(): ExpressionSyntax;
}

export abstract class ExpressionSyntax extends Syntax<ExpressionSyntax> {
  public type: string;

  prettyPrint(): PrettyPrintValue {
    return `${this.type}`
  }

  abstract compile(compiler: Compiler): CompiledExpression;
}