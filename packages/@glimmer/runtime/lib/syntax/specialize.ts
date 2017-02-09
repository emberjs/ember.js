import * as WireFormat from '@glimmer/wire-format';
import { dict, assert } from '@glimmer/util';
import { SymbolTable } from '@glimmer/interfaces';

export type Syntax = WireFormat.Statement;
export type Name = WireFormat.Statement[0];
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
// import E = WireFormat.Expressions;

const { Ops } = WireFormat;

SPECIALIZE.add(Ops.Append, (sexp: S.Append, _symbolTable) => {
  // let expression = sexp[1];

  // if (Array.isArray(expression) && E.isGet(expression)) {
  //   let path = expression[1];

  //   if (path.length !== 1) {
  //     return [Ops.UnoptimizedAppend, sexp[1], sexp[2]];
  //   }
  // }

  return [Ops.ClientSideStatement, Ops.OptimizedAppend, sexp[1], sexp[2]];
});

SPECIALIZE.add(Ops.DynamicAttr, (sexp: S.DynamicAttr, _symbolTable) => {
  return [Ops.ClientSideStatement, Ops.AnyDynamicAttr, sexp[1], sexp[2], sexp[3], false];
});

SPECIALIZE.add(Ops.TrustingAttr, (sexp: S.TrustingAttr, _symbolTable) => {
  return [Ops.ClientSideStatement, Ops.AnyDynamicAttr, sexp[1], sexp[2], sexp[3], true];
});

SPECIALIZE.add(Ops.Partial, (sexp: S.Partial, _table) => {
  let expression = sexp[1];

  if (typeof expression === 'string') {
    return [Ops.ClientSideStatement, Ops.StaticPartial, expression];
  } else {
    return [Ops.ClientSideStatement, Ops.DynamicPartial, expression];
  }
});
