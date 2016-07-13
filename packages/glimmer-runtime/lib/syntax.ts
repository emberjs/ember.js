import { Dict, LinkedListNode, Slice, InternedString } from 'glimmer-util';
import { BlockScanner } from './scanner';
import { Environment } from './environment';
import { CompiledExpression } from './compiled/expressions';
import { Opcode, OpSeq } from './opcodes';
import { InlineBlock, Block } from './compiled/blocks';

import OpcodeBuilder from './opcode-builder';

import {
  Statement as SerializedStatement,
  Expression as SerializedExpression,
  BlockMeta
} from 'glimmer-wire-format';

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

interface StatementClass<T extends SerializedStatement, U extends Statement> {
  fromSpec(spec: T, blocks?: InlineBlock[]): U;
}

export abstract class Statement implements LinkedListNode {
  static fromSpec<T extends SerializedStatement>(spec: T, blocks?: InlineBlock[]): Statement {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  public type: string;
  public next: Statement = null;
  public prev: Statement = null;

  prettyPrint(): PrettyPrintValue {
    return new PrettyPrint(this.type, this.type);
  }

  clone(): this {
    // not type safe but the alternative is extreme boilerplate per
    // syntax subclass.
    return new (<new (any) => any>this.constructor)(this);
  }

  abstract compile(opcodes: StatementCompilationBuffer, env: Environment, block: Block);

  scan(scanner: BlockScanner): Statement {
    return this;
  }
}

interface ExpressionClass<T extends SerializedExpression, U extends Expression<T>> {
  fromSpec(spec: T, blocks?: InlineBlock[]): U;
}

export abstract class Expression<T> {
  static fromSpec<T extends SerializedExpression, U extends Expression<T>>(spec: T, blocks?: InlineBlock[]): U {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  public type: string;

  prettyPrint(): PrettyPrintValue {
    return `${this.type}`;
  }

  abstract compile(compiler: SymbolLookup, env: Environment, parentMeta?: BlockMeta): CompiledExpression<T>;
}

export interface SymbolLookup {
  getLocalSymbol(name: InternedString): number;
  hasLocalSymbol(name: InternedString): boolean;
  getNamedSymbol(name: InternedString): number;
  hasNamedSymbol(name: InternedString): boolean;
  getBlockSymbol(name: InternedString): number;
  hasBlockSymbol(name: InternedString): boolean;

  // only used for {{view.name}}
  hasKeyword(name: InternedString): boolean;
}

export interface CompileInto {
  append(op: Opcode);
}

export interface StatementCompilationBuffer extends CompileInto, SymbolLookup, OpcodeBuilder {
  toOpSeq(): OpSeq;
}

export type Program = Slice<Statement>;

export const ATTRIBUTE = "e1185d30-7cac-4b12-b26a-35327d905d92";
export const ARGUMENT = "0f3802314-d747-bbc5-0168-97875185c3rt";

export type Parameter<T> = Attribute<T> | Argument<T>;

export abstract class Attribute<T> extends Statement {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  name: InternedString;
  namespace: InternedString;
  abstract valueSyntax(): Expression<T>;
}

export abstract class Argument<T> extends Statement {
  "0f3802314-d747-bbc5-0168-97875185c3rt" = true;
  name: InternedString;
  namespace: InternedString;
  abstract valueSyntax(): Expression<T>;
}

export function isAttribute(value: Statement): value is Attribute<any> {
  return value && value[ATTRIBUTE] === true;
}
