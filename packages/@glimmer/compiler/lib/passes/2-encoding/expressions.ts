import { PresentArray, SexpOpcodes, WireFormat } from '@glimmer/interfaces';
import { ASTv2 } from '@glimmer/syntax';
import { assertPresent, isPresent, mapPresent } from '@glimmer/util';

import * as mir from './mir';

export type HashPair = [string, WireFormat.Expression];

export class ExpressionEncoder {
  expr(expr: mir.ExpressionNode): WireFormat.Expression {
    switch (expr.type) {
      case 'Missing':
        return undefined;
      case 'Literal':
        return this.Literal(expr);
      case 'CallExpression':
        return this.CallExpression(expr);
      case 'PathExpression':
        return this.PathExpression(expr);
      case 'Arg':
      case 'Local':
        return [SexpOpcodes.GetSymbol, expr.symbol];
      case 'This':
        return [SexpOpcodes.GetSymbol, 0];
      case 'Free':
        return [expr.resolution.resolution(), expr.symbol];
      case 'HasBlock':
        return this.HasBlock(expr);
      case 'HasBlockParams':
        return this.HasBlockParams(expr);
      case 'InterpolateExpression':
        return this.InterpolateExpression(expr);
    }
  }

  Literal({
    value,
  }: ASTv2.LiteralExpression): WireFormat.Expressions.Value | WireFormat.Expressions.Undefined {
    if (value === undefined) {
      return [SexpOpcodes.Undefined];
    } else {
      return value;
    }
  }

  Missing(): undefined {
    return undefined;
  }

  HasBlock({ symbol }: mir.HasBlock): WireFormat.Expressions.HasBlock {
    return [SexpOpcodes.HasBlock, [SexpOpcodes.GetSymbol, symbol]];
  }

  HasBlockParams({ symbol }: mir.HasBlockParams): WireFormat.Expressions.HasBlockParams {
    return [SexpOpcodes.HasBlockParams, [SexpOpcodes.GetSymbol, symbol]];
  }

  Free({
    symbol,
    context,
  }: mir.GetFreeWithContext):
    | WireFormat.Expressions.GetContextualFree
    | WireFormat.Expressions.GetStrictFree {
    return [context.resolution(), symbol];
  }

  // GetFree({ symbol }: mir.GetFree): WireFormat.Expressions.GetStrictFree {
  //   return [SexpOpcodes.GetStrictFree, symbol];
  // }

  GetWithResolver({ symbol }: mir.GetWithResolver): WireFormat.Expressions.GetContextualFree {
    return [SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback, symbol];
  }

  GetSymbol({ symbol }: mir.GetSymbol): WireFormat.Expressions.GetSymbol {
    return [SexpOpcodes.GetSymbol, symbol];
  }

  PathExpression({ head, tail }: mir.PathExpression): WireFormat.Expressions.GetPath {
    let getOp = EXPR.expr(head) as WireFormat.Expressions.GetVar;

    return [...getOp, EXPR.Tail(tail)];
  }

  InterpolateExpression({ parts }: mir.InterpolateExpression): WireFormat.Expressions.Concat {
    return [SexpOpcodes.Concat, parts.map((e) => EXPR.expr(e)).toArray()];
  }

  CallExpression({ callee, args }: mir.CallExpression): WireFormat.Expressions.Helper {
    // let head = ctx.popValue(EXPR);
    // let params = ctx.popValue(PARAMS);
    // let hash = ctx.popValue(HASH);

    return [SexpOpcodes.Call, EXPR.expr(callee), ...EXPR.Args(args)];
  }

  Tail({ members }: mir.Tail): PresentArray<string> {
    return mapPresent(members, (member) => member.chars);
  }

  Args({ positional, named }: mir.Args): WireFormat.Core.Args {
    return [this.Positional(positional), this.NamedArguments(named)];
  }

  Positional({ list }: mir.Positional): WireFormat.Core.Params {
    return list.map((l) => EXPR.expr(l)).toPresentArray();
  }

  NamedArgument({ key, value }: mir.NamedArgument): HashPair {
    return [key.chars, EXPR.expr(value)];
  }

  NamedArguments({ entries: pairs }: mir.NamedArguments): WireFormat.Core.Hash {
    let list = pairs.toArray();

    if (isPresent(list)) {
      let names: string[] = [];
      let values: WireFormat.Expression[] = [];

      for (let pair of list) {
        let [name, value] = EXPR.NamedArgument(pair);
        names.push(name);
        values.push(value);
      }

      assertPresent(names);
      assertPresent(values);

      return [names, values];
    } else {
      return null;
    }
  }
}

export const EXPR = new ExpressionEncoder();
