import { PresentArray, SexpOpcodes, WireFormat } from '@glimmer/interfaces';
import { ASTv2 } from '@glimmer/syntax';
import { assertPresentArray, isPresentArray, mapPresentArray } from '@glimmer/util';

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
      case 'DeprecatedCallExpression':
        return this.DeprecatedCallExpression(expr);
      case 'PathExpression':
        return this.PathExpression(expr);
      case 'Arg':
        return [SexpOpcodes.GetSymbol, expr.symbol];
      case 'Local':
        return this.Local(expr);
      case 'This':
        return [SexpOpcodes.GetSymbol, 0];
      case 'Free':
        return [expr.resolution.resolution(), expr.symbol];
      case 'HasBlock':
        return this.HasBlock(expr);
      case 'HasBlockParams':
        return this.HasBlockParams(expr);
      case 'Curry':
        return this.Curry(expr);
      case 'Not':
        return this.Not(expr);
      case 'IfInline':
        return this.IfInline(expr);
      case 'InterpolateExpression':
        return this.InterpolateExpression(expr);
      case 'GetDynamicVar':
        return this.GetDynamicVar(expr);
      case 'Log':
        return this.Log(expr);
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

  Curry({ definition, curriedType, args }: mir.Curry): WireFormat.Expressions.Curry {
    return [
      SexpOpcodes.Curry,
      EXPR.expr(definition),
      curriedType,
      EXPR.Positional(args.positional),
      EXPR.NamedArguments(args.named),
    ];
  }

  Local({
    isTemplateLocal,
    symbol,
  }: ASTv2.LocalVarReference):
    | WireFormat.Expressions.GetSymbol
    | WireFormat.Expressions.GetLexicalSymbol {
    return [isTemplateLocal ? SexpOpcodes.GetLexicalSymbol : SexpOpcodes.GetSymbol, symbol];
  }

  GetWithResolver({ symbol }: mir.GetWithResolver): WireFormat.Expressions.GetContextualFree {
    return [SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback, symbol];
  }

  PathExpression({ head, tail }: mir.PathExpression): WireFormat.Expressions.GetPath {
    let getOp = EXPR.expr(head) as WireFormat.Expressions.GetVar;

    return [...getOp, EXPR.Tail(tail)];
  }

  InterpolateExpression({ parts }: mir.InterpolateExpression): WireFormat.Expressions.Concat {
    return [SexpOpcodes.Concat, parts.map((e) => EXPR.expr(e)).toArray()];
  }

  CallExpression({ callee, args }: mir.CallExpression): WireFormat.Expressions.Helper {
    return [SexpOpcodes.Call, EXPR.expr(callee), ...EXPR.Args(args)];
  }

  DeprecatedCallExpression({
    arg,
    callee,
  }: mir.DeprecatedCallExpression): WireFormat.Expressions.GetPathFreeAsDeprecatedHelperHeadOrThisFallback {
    return [SexpOpcodes.GetFreeAsDeprecatedHelperHeadOrThisFallback, callee.symbol, [arg.chars]];
  }

  Tail({ members }: mir.Tail): PresentArray<string> {
    return mapPresentArray(members, (member) => member.chars);
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

    if (isPresentArray(list)) {
      let names: string[] = [];
      let values: WireFormat.Expression[] = [];

      for (let pair of list) {
        let [name, value] = EXPR.NamedArgument(pair);
        names.push(name);
        values.push(value);
      }

      assertPresentArray(names);
      assertPresentArray(values);

      return [names, values];
    } else {
      return null;
    }
  }

  Not({ value }: mir.Not): WireFormat.Expressions.Not {
    return [SexpOpcodes.Not, EXPR.expr(value)];
  }

  IfInline({ condition, truthy, falsy }: mir.IfInline): WireFormat.Expressions.IfInline {
    let expr = [SexpOpcodes.IfInline, EXPR.expr(condition), EXPR.expr(truthy)];

    if (falsy) {
      expr.push(EXPR.expr(falsy));
    }

    return expr as WireFormat.Expressions.IfInline;
  }

  GetDynamicVar({ name }: mir.GetDynamicVar): WireFormat.Expressions.GetDynamicVar {
    return [SexpOpcodes.GetDynamicVar, EXPR.expr(name)];
  }

  Log({ positional }: mir.Log): WireFormat.Expressions.Log {
    return [SexpOpcodes.Log, this.Positional(positional)];
  }
}

export const EXPR = new ExpressionEncoder();
