import { LinkedListNode, Slice, Option } from 'glimmer-util';
import { BlockScanner } from './scanner';
import { Environment } from './environment';
import { CompiledExpression } from './compiled/expressions';
import { Opcode, OpSeq } from './opcodes';
import { InlineBlock } from './compiled/blocks';
import SymbolTable from './symbol-table';

import { ComponentBuilder } from './opcode-builder';

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

  abstract compile(opcodes: StatementCompilationBuffer, env: Environment, symbolTable: SymbolTable);

  scan(scanner: BlockScanner): Statement {
    return this;
  }
}

interface ExpressionClass<T extends SerializedExpression, U extends Expression<T>> {
  fromSpec(spec: T, blocks?: InlineBlock[]): U;
}

export interface CompilesInto<T> {
  compile(dsl: SymbolLookup, env: Environment, symbolTable: SymbolTable): T;
}

export abstract class Expression<T> implements CompilesInto<CompiledExpression<T>> {
  static fromSpec<T extends SerializedExpression, U extends Expression<T>>(spec: T, blocks?: InlineBlock[]): U {
    throw new Error(`You need to implement fromSpec on ${this}`);
  }

  public abstract type: string;

  abstract compile(dsl: SymbolLookup, env: Environment, symbolTable: SymbolTable): CompiledExpression<T>;
}

export interface SymbolLookup {
  getLocalSymbol(name: string): number;
  hasLocalSymbol(name: string): boolean;
  getNamedSymbol(name: string): number;
  hasNamedSymbol(name: string): boolean;
  getBlockSymbol(name: string): number;
  hasBlockSymbol(name: string): boolean;
  getPartialArgsSymbol(): number;
  hasPartialArgsSymbol(): boolean;
}

export interface CompileInto {
  append(op: Opcode);
}

export interface StatementCompilationBuffer extends CompileInto, SymbolLookup {
  component: ComponentBuilder;
  toOpSeq(): OpSeq;
}

export type Program = Slice<Statement>;

export const ATTRIBUTE = "e1185d30-7cac-4b12-b26a-35327d905d92";
export const ARGUMENT = "0f3802314-d747-bbc5-0168-97875185c3rt";

export type Parameter<T> = Attribute<T> | Argument<T>;

export abstract class Attribute<T> extends Statement {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  name: string;
  namespace: Option<string>;
  abstract valueSyntax(): Expression<T>;
}

export abstract class Argument<T> extends Statement {
  "0f3802314-d747-bbc5-0168-97875185c3rt" = true;
  name: string;
  namespace: Option<string>;
  abstract valueSyntax(): Expression<T>;
}

export function isAttribute(value: Statement): value is Attribute<any> {
  return value && value[ATTRIBUTE] === true;
}
