import { Dict, LinkedListNode, Slice, InternedString, intern } from 'glimmer-util';
import { Environment } from './environment';
import { CompiledExpression } from './compiled/expressions';
import { Opcode } from './opcodes';
import { RawTemplate, RawBlock } from './compiler';

import {
  Statement as SerializedStatement,
  Expression as SerializedExpression
} from 'glimmer-compiler';

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

abstract class Syntax {
  static (spec: any, blocks?: RawTemplate[]): Syntax {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  public type: string;

  prettyPrint(): PrettyPrintValue {
    return `${this.type}`;
  }

  abstract compile(compiler: CompileInto, env: Environment): any;
}

export default Syntax;

interface StatementClass<T extends SerializedStatement, U extends Statement> {
  fromSpec(spec: T, blocks?: RawBlock[]): U;
}

export abstract class Statement extends Syntax implements LinkedListNode {
  static fromSpec<T extends SerializedStatement>(spec: T, blocks?: RawTemplate[]): Statement {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  public type: string;
  public next: this = null;
  public prev: this = null;

  prettyPrint(): PrettyPrintValue {
    return new PrettyPrint(this.type, this.type);
  }

  clone(): this {
    // not type safe but the alternative is extreme boilerplate per
    // syntax subclass.
    return new (<new (any) => any>this.constructor)(this);
  }

  abstract compile(opcodes: CompileInto, env: Environment);
}

interface ExpressionClass<T extends SerializedExpression, U extends Expression> {
  fromSpec(spec: T, blocks?: RawBlock[]): U;
}

export abstract class Expression extends Syntax{
  static fromSpec<T extends SerializedExpression, U extends Expression>(spec: T, blocks?: RawTemplate[]): U {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  public type: string;

  prettyPrint(): PrettyPrintValue {
    return `${this.type}`;
  }

  abstract compile(compiler: CompileInto, env: Environment): CompiledExpression;
}

export interface CompileInto {
  append(op: Opcode);
  getSymbol(name: InternedString): number;
  getBlockSymbol(name: InternedString): number;
}

export type Program = Slice<Statement>;

export const ATTRIBUTE_SYNTAX = "e1185d30-7cac-4b12-b26a-35327d905d92";

export abstract class Attribute extends Statement {
  "e1185d30-7cac-4b12-b26a-35327d905d92": boolean;
  name: InternedString;
  namespace: InternedString;

  lookupName(): InternedString {
    return intern(`@${this.name}`);
  }

  abstract toLookup(): { syntax: Attribute, symbol: InternedString };
  abstract valueSyntax(): Expression;
  abstract isAttribute(): boolean;
}