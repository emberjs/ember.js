import * as WireFormat from 'glimmer-wire-format';
import { BaselineSyntax } from '../scanner';
import { dict, assert } from 'glimmer-util';
import { SymbolTable } from 'glimmer-interfaces';

export type Syntax = BaselineSyntax.AnyStatement;
export type Name = BaselineSyntax.AnyStatement[0];
export type SpecializeFunction = (sexp: Syntax, symbolTable: SymbolTable) => Syntax;

export class Specialize {
  private names = dict<number>();
  private funcs: SpecializeFunction[] = [];

  add(name: Name, func: SpecializeFunction) {
    this.funcs.push(func);
    this.names[name] = this.funcs.length - 1;
  }

  specialize(sexp: Syntax, table: SymbolTable): Syntax {
    let name: Name = sexp[0];
    let index = this.names[name];

    if (index === undefined) return sexp;

    let func = this.funcs[index];
    assert(!!func, `expected a specialization for ${sexp[0]}`);
    return func(sexp, table);
  }
}

export const SPECIALIZE = new Specialize();

import S = WireFormat.Statements;

SPECIALIZE.add('append', (sexp: S.Append, symbolTable: SymbolTable) => {
  return ['optimized-append', sexp[1], sexp[2]];
});

SPECIALIZE.add('dynamic-attr', (sexp: S.DynamicAttr, symbolTable: SymbolTable) => {
  return ['any-dynamic-attr', sexp[1], sexp[2], sexp[3], false];
});

SPECIALIZE.add('trusting-attr', (sexp: S.TrustingAttr, symbolTable: SymbolTable) => {
  return ['any-dynamic-attr', sexp[1], sexp[2], sexp[3], true];
});