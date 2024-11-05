import type { HasSourceSpan } from '@glimmer/syntax';
import { generateSyntaxError, loc } from '@glimmer/syntax';
import { CurriedTypes } from '@glimmer/vm';

import type { Result } from '../../../shared/result';
import type * as mir from '../../2-encoding/mir';
import type { ResolutionType } from './constants';

import { Err, Ok } from '../../../shared/result';
import {
  COMPONENT_OR_HELPER_RESOLUTION,
  COMPONENT_RESOLUTION,
  HELPER_RESOLUTION,
  MODIFIER_RESOLUTION,
  VALUE_RESOLUTION,
} from './constants';

export default class StrictModeValidationPass {
  // This is done at the end of all the keyword normalizations
  // At this point any free variables that isn't a valid keyword
  // in its context should be considered a syntax error. We
  // probably had various opportunities to do this inline in the
  // earlier passes, but this aims to produce a better syntax
  // error as we don't always have the right loc-context to do
  // so in the other spots.
  static validate(template: mir.Template): Result<mir.Template> {
    return new this(template).validate();
  }

  private constructor(private template: mir.Template) {}

  validate(): Result<mir.Template> {
    return this.Statements(this.template.body).mapOk(() => this.template);
  }

  Statements(statements: mir.Statement[]): Result<null> {
    let result = Ok(null);

    for (let statement of statements) {
      result = result.andThen(() => this.Statement(statement));
    }

    return result;
  }

  NamedBlocks({ blocks }: mir.NamedBlocks): Result<null> {
    let result = Ok(null);

    for (let block of blocks.toArray()) {
      result = result.andThen(() => this.NamedBlock(block));
    }

    return result;
  }

  NamedBlock(block: mir.NamedBlock): Result<null> {
    return this.Statements(block.body);
  }

  Statement(statement: mir.Statement): Result<null> {
    switch (statement.type) {
      case 'InElement':
        return this.InElement(statement);

      case 'Debugger':
        return Ok(null);

      case 'Yield':
        return this.Yield(statement);

      case 'AppendTrustedHTML':
        return this.AppendTrustedHTML(statement);

      case 'AppendTextNode':
        return this.AppendTextNode(statement);

      case 'Component':
        return this.Component(statement);

      case 'SimpleElement':
        return this.SimpleElement(statement);

      case 'InvokeBlock':
        return this.InvokeBlock(statement);

      case 'AppendComment':
        return Ok(null);

      case 'If':
        return this.If(statement);

      case 'Each':
        return this.Each(statement);

      case 'Let':
        return this.Let(statement);

      case 'WithDynamicVars':
        return this.WithDynamicVars(statement);

      case 'InvokeComponent':
        return this.InvokeComponent(statement);
    }
  }

  Expressions(expressions: mir.ExpressionNode[]): Result<null> {
    let result = Ok(null);

    for (let expression of expressions) {
      result = result.andThen(() => this.Expression(expression));
    }

    return result;
  }

  Expression(
    expression: mir.ExpressionNode,
    span: HasSourceSpan = expression,
    resolution?: ResolutionType
  ): Result<null> {
    switch (expression.type) {
      case 'Literal':
      case 'Keyword':
      case 'Missing':
      case 'This':
      case 'Arg':
      case 'Local':
      case 'HasBlock':
      case 'HasBlockParams':
      case 'GetDynamicVar':
        return Ok(null);

      case 'PathExpression':
        return this.Expression(expression.head, span, resolution);

      case 'Free':
        return this.errorFor(expression.name, span, resolution);

      case 'InterpolateExpression':
        return this.InterpolateExpression(expression, span, resolution);

      case 'CallExpression':
        return this.CallExpression(expression, span, resolution ?? HELPER_RESOLUTION);

      case 'Not':
        return this.Expression(expression.value, span, resolution);

      case 'IfInline':
        return this.IfInline(expression);

      case 'Curry':
        return this.Curry(expression);

      case 'Log':
        return this.Log(expression);
    }
  }

  Args(args: mir.Args): Result<null> {
    return this.Positional(args.positional).andThen(() => this.NamedArguments(args.named));
  }

  Positional(positional: mir.Positional, span?: HasSourceSpan): Result<null> {
    let result = Ok(null);
    let expressions = positional.list.toArray();

    // For cases like {{yield foo}}, when there is only a single argument, it
    // makes for a slightly better error to report that entire span. However,
    // when there are more than one, we need to be specific.
    if (expressions.length === 1) {
      result = this.Expression(expressions[0]!, span);
    } else {
      result = this.Expressions(expressions);
    }

    return result;
  }

  NamedArguments({ entries }: mir.NamedArguments): Result<null> {
    let result = Ok(null);

    for (let arg of entries.toArray()) {
      result = result.andThen(() => this.NamedArgument(arg));
    }

    return result;
  }

  NamedArgument(arg: mir.NamedArgument): Result<null> {
    if (arg.value.type === 'CallExpression') {
      return this.Expression(arg.value, arg, HELPER_RESOLUTION);
    } else {
      return this.Expression(arg.value, arg);
    }
  }

  ElementParameters({ body }: mir.ElementParameters): Result<null> {
    let result = Ok(null);

    for (let param of body.toArray()) {
      result = result.andThen(() => this.ElementParameter(param));
    }

    return result;
  }

  ElementParameter(param: mir.ElementParameter): Result<null> {
    switch (param.type) {
      case 'StaticAttr':
        return Ok(null);
      case 'DynamicAttr':
        return this.DynamicAttr(param);
      case 'Modifier':
        return this.Modifier(param);
      case 'SplatAttr':
        return Ok(null);
    }
  }

  DynamicAttr(attr: mir.DynamicAttr): Result<null> {
    if (attr.value.type === 'CallExpression') {
      return this.Expression(attr.value, attr, HELPER_RESOLUTION);
    } else {
      return this.Expression(attr.value, attr);
    }
  }

  Modifier(modifier: mir.Modifier): Result<null> {
    return this.Expression(modifier.callee, modifier, MODIFIER_RESOLUTION).andThen(() =>
      this.Args(modifier.args)
    );
  }

  InElement(inElement: mir.InElement): Result<null> {
    return (
      this.Expression(inElement.destination)
        // Unfortunately we lost the `insertBefore=` part of the span
        .andThen(() => this.Expression(inElement.insertBefore))
        .andThen(() => this.NamedBlock(inElement.block))
    );
  }

  Yield(statement: mir.Yield): Result<null> {
    return this.Positional(statement.positional, statement);
  }

  AppendTrustedHTML(statement: mir.AppendTrustedHTML): Result<null> {
    return this.Expression(statement.html, statement);
  }

  AppendTextNode(statement: mir.AppendTextNode): Result<null> {
    if (statement.text.type === 'CallExpression') {
      return this.Expression(statement.text, statement, COMPONENT_OR_HELPER_RESOLUTION);
    } else {
      return this.Expression(statement.text, statement);
    }
  }

  Component(statement: mir.Component): Result<null> {
    return this.Expression(statement.tag, statement, COMPONENT_RESOLUTION)
      .andThen(() => this.ElementParameters(statement.params))
      .andThen(() => this.NamedArguments(statement.args))
      .andThen(() => this.NamedBlocks(statement.blocks));
  }

  SimpleElement(statement: mir.SimpleElement): Result<null> {
    return this.ElementParameters(statement.params).andThen(() => this.Statements(statement.body));
  }

  InvokeBlock(statement: mir.InvokeBlock): Result<null> {
    return this.Expression(statement.head, statement.head, COMPONENT_RESOLUTION)
      .andThen(() => this.Args(statement.args))
      .andThen(() => this.NamedBlocks(statement.blocks));
  }

  If(statement: mir.If): Result<null> {
    return this.Expression(statement.condition, statement)
      .andThen(() => this.NamedBlock(statement.block))
      .andThen(() => {
        if (statement.inverse) {
          return this.NamedBlock(statement.inverse);
        } else {
          return Ok(null);
        }
      });
  }

  Each(statement: mir.Each): Result<null> {
    return this.Expression(statement.value, statement)
      .andThen(() => {
        if (statement.key) {
          return this.Expression(statement.key, statement);
        } else {
          return Ok(null);
        }
      })
      .andThen(() => this.NamedBlock(statement.block))
      .andThen(() => {
        if (statement.inverse) {
          return this.NamedBlock(statement.inverse);
        } else {
          return Ok(null);
        }
      });
  }

  Let(statement: mir.Let): Result<null> {
    return this.Positional(statement.positional).andThen(() => this.NamedBlock(statement.block));
  }

  WithDynamicVars(statement: mir.WithDynamicVars): Result<null> {
    return this.NamedArguments(statement.named).andThen(() => this.NamedBlock(statement.block));
  }

  InvokeComponent(statement: mir.InvokeComponent): Result<null> {
    return this.Expression(statement.definition, statement, COMPONENT_RESOLUTION)
      .andThen(() => this.Args(statement.args))
      .andThen(() => {
        if (statement.blocks) {
          return this.NamedBlocks(statement.blocks);
        } else {
          return Ok(null);
        }
      });
  }

  InterpolateExpression(
    expression: mir.InterpolateExpression,
    span: HasSourceSpan,
    resolution?: ResolutionType
  ): Result<null> {
    let expressions = expression.parts.toArray();

    if (expressions.length === 1) {
      return this.Expression(expressions[0], span, resolution);
    } else {
      return this.Expressions(expressions);
    }
  }

  CallExpression(
    expression: mir.CallExpression,
    span: HasSourceSpan,
    resolution?: ResolutionType
  ): Result<null> {
    return this.Expression(expression.callee, span, resolution).andThen(() =>
      this.Args(expression.args)
    );
  }

  IfInline(expression: mir.IfInline): Result<null> {
    return this.Expression(expression.condition)
      .andThen(() => this.Expression(expression.truthy))
      .andThen(() => {
        if (expression.falsy) {
          return this.Expression(expression.falsy);
        } else {
          return Ok(null);
        }
      });
  }

  Curry(expression: mir.Curry): Result<null> {
    let resolution: ResolutionType;

    if (expression.curriedType === CurriedTypes.Component) {
      resolution = COMPONENT_RESOLUTION;
    } else if (expression.curriedType === CurriedTypes.Helper) {
      resolution = HELPER_RESOLUTION;
    } else {
      resolution = MODIFIER_RESOLUTION;
    }

    return this.Expression(expression.definition, expression, resolution).andThen(() =>
      this.Args(expression.args)
    );
  }

  Log(expression: mir.Log): Result<null> {
    return this.Positional(expression.positional, expression);
  }

  errorFor(
    name: string,
    span: HasSourceSpan,
    type: ResolutionType = VALUE_RESOLUTION
  ): Result<never> {
    return Err(
      generateSyntaxError(
        `Attempted to resolve a ${type} in a strict mode template, but that value was not in scope: ${name}`,
        loc(span)
      )
    );
  }
}
