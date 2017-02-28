import * as WireFormat from '@glimmer/wire-format';
import { dict, assert } from '@glimmer/util';

import { ClientSide } from '../scanner';

export type Syntax = WireFormat.Statement;
export type Name = WireFormat.Statement[0];
export type SpecializeFunction = (sexp: Syntax) => Syntax;

export class Specialize {
  private names = dict<number>();
  private funcs: SpecializeFunction[] = [];

  add(name: Name, func: SpecializeFunction) {
    this.funcs.push(func);
    this.names[name] = this.funcs.length - 1;
  }

  specialize(sexp: Syntax): Syntax {
    let name: Name = sexp[0];
    let index = this.names[name];

    if (index === undefined) return sexp;

    let func = this.funcs[index];
    assert(!!func, `expected a specialization for ${sexp[0]}`);
    return func(sexp);
  }
}

export const SPECIALIZE = new Specialize();

import S = WireFormat.Statements;
// import E = WireFormat.Expressions;

const { Ops } = WireFormat;

SPECIALIZE.add(Ops.Append, (sexp: S.Append) => {
  // let expression = sexp[1];

  // if (Array.isArray(expression) && E.isGet(expression)) {
  //   let path = expression[1];

  //   if (path.length !== 1) {
  //     return [Ops.UnoptimizedAppend, sexp[1], sexp[2]];
  //   }
  // }

  return [Ops.ClientSideStatement, ClientSide.Ops.OptimizedAppend, sexp[1], sexp[2]];
});

SPECIALIZE.add(Ops.DynamicAttr, (sexp: S.DynamicAttr) => {
  return [Ops.ClientSideStatement, ClientSide.Ops.AnyDynamicAttr, sexp[1], sexp[2], sexp[3], false];
});

SPECIALIZE.add(Ops.TrustingAttr, (sexp: S.TrustingAttr) => {
  return [Ops.ClientSideStatement, ClientSide.Ops.AnyDynamicAttr, sexp[1], sexp[2], sexp[3], true];
});
