import { PresentArray } from '@glimmer/interfaces';

import { SourceSlice } from '../../source/slice';
import type { CallFields } from './base';
import { node } from './node';
import type { VariableReference } from './refs';

/**
 * A Handlebars literal.
 *
 * {@link https://handlebarsjs.com/guide/expressions.html#literal-segments}
 */
export type LiteralValue = string | boolean | number | undefined | null;

export interface LiteralTypes {
  string: string;
  boolean: boolean;
  number: number;
  null: null;
  undefined: undefined;
}

/**
 * Corresponds to a Handlebars literal.
 *
 * @see {LiteralValue}
 */
export class LiteralExpression extends node('Literal').fields<{ value: LiteralValue }>() {
  toSlice(this: StringLiteral): SourceSlice {
    return new SourceSlice({ loc: this.loc, chars: this.value });
  }
}

export type StringLiteral = LiteralExpression & { value: string };

/**
 * Returns true if an input {@see ExpressionNode} is a literal.
 */
export function isLiteral<K extends keyof LiteralTypes = keyof LiteralTypes>(
  node: ExpressionNode,
  kind?: K
): node is StringLiteral {
  if (node.type === 'Literal') {
    if (kind === undefined) {
      return true;
    } else if (kind === 'null') {
      return node.value === null;
    } else {
      return typeof node.value === kind;
    }
  } else {
    return false;
  }
}

/**
 * Corresponds to a path in expression position.
 *
 * ```hbs
 * this
 * this.x
 * @x
 * @x.y
 * x
 * x.y
 * ```
 */
export class PathExpression extends node('Path').fields<{
  ref: VariableReference;
  tail: readonly SourceSlice[];
}>() {}

/**
 * Corresponds to a parenthesized call expression.
 *
 * ```hbs
 * (x)
 * (x.y)
 * (x y)
 * (x.y z)
 * ```
 */
export class CallExpression extends node('Call').fields<CallFields>() {}

/**
 * Corresponds to an interpolation in attribute value position.
 *
 * ```hbs
 * <a href="{{url}}.html"
 * ```
 */
export class InterpolateExpression extends node('Interpolate').fields<{
  parts: PresentArray<ExpressionNode>;
}>() {}

export type ExpressionNode =
  | LiteralExpression
  | PathExpression
  | CallExpression
  | InterpolateExpression;
