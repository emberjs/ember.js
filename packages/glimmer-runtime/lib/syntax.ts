import { LinkedListNode, Slice, Option } from 'glimmer-util';
import { BlockScanner } from './scanner';
import { Environment } from './environment';
import { CompiledExpression } from './compiled/expressions';
import { Opcode, OpSeq } from './opcodes';
import { InlineBlock } from './compiled/blocks';
import { SymbolTable } from 'glimmer-interfaces';

import { ComponentBuilder } from './opcode-builder';

import OpcodeBuilderDSL, { CompilesInto } from './compiled/opcodes/builder';

import {
  Statement as SerializedStatement,
  Expression as SerializedExpression
} from 'glimmer-wire-format';

interface StatementClass<T extends SerializedStatement, U extends Statement> {
  fromSpec(spec: T, blocks?: InlineBlock[]): U;
}

export abstract class Statement implements LinkedListNode {
  static fromSpec<T extends SerializedStatement>(spec: T, symbolTable: SymbolTable, scanner?: BlockScanner): Statement {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  public abstract type: string;
  public next: Option<Statement> = null;
  public prev: Option<Statement> = null;

  clone(): this {
    // not type safe but the alternative is extreme boilerplate per
    // syntax subclass.
    return new (<new (any) => any>this.constructor)(this);
  }

  abstract compile(builder: OpcodeBuilderDSL);

  scan(scanner: BlockScanner): Statement {
    return this;
  }
}

interface ExpressionClass<T extends SerializedExpression, U extends Expression<T>> {
  fromSpec(spec: T, blocks?: InlineBlock[]): U;
}

export abstract class Expression<T> implements CompilesInto<CompiledExpression<T>> {
  static fromSpec<T extends SerializedExpression, U extends Expression<T>>(spec: T, blocks?: InlineBlock[]): U {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  public abstract type: string;

  abstract compile(dsl: OpcodeBuilderDSL): CompiledExpression<T>;
}

export interface SymbolLookup {
  symbolTable: SymbolTable;
}

export interface CompileInto {
  append(op: Opcode);
}

export type Program = Slice<Statement>;

export const ATTRIBUTE = "e1185d30-7cac-4b12-b26a-35327d905d92";
export const ARGUMENT = "0f3802314-d747-bbc5-0168-97875185c3rt";

export type Parameter<T> = Attribute<T> | Argument<T>;

export abstract class Attribute<T> {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  name: string;
  namespace: Option<string>;
  abstract valueSyntax(): Expression<T>;
}

export abstract class Argument<T> {
  "0f3802314-d747-bbc5-0168-97875185c3rt" = true;
  name: string;
  namespace: Option<string>;
  abstract valueSyntax(): Expression<T>;
}

export function isAttribute(value: Object): value is Attribute<any> {
  return value && value[ATTRIBUTE] === true;
}
