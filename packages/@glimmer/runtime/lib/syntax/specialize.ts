import * as WireFormat from '@glimmer/wire-format';
import { BaselineSyntax } from '../scanner';
import { dict, assert } from '@glimmer/util';
import { SymbolTable } from '@glimmer/interfaces';

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
import E = WireFormat.Expressions;

SPECIALIZE.add('append', (sexp: S.Append, _symbolTable) => {
  let path = sexp[1];

  if (Array.isArray(path) && (E.isUnknown(path) || E.isGet(path))) {
    if (path[1].length !== 1) {

      return ['unoptimized-append', sexp[1], sexp[2]];
    }
  }

  return ['optimized-append', sexp[1], sexp[2]];
});

SPECIALIZE.add('dynamic-attr', (sexp: S.DynamicAttr, _symbolTable) => {
  return ['any-dynamic-attr', sexp[1], sexp[2], sexp[3], false];
});

SPECIALIZE.add('trusting-attr', (sexp: S.TrustingAttr, _symbolTable) => {
  return ['any-dynamic-attr', sexp[1], sexp[2], sexp[3], true];
});

SPECIALIZE.add('partial', (sexp: S.Partial, _table) => {
  let expression = sexp[1];

  if (typeof expression === 'string') {
    return ['static-partial', expression];
  } else {
    return ['dynamic-partial', expression];
  }
});
