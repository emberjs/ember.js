import type {
  AttrOpcode,
  ComponentAttrOpcode,
  DynamicAttrOpcode,
  StaticAttrOpcode,
  StaticComponentAttrOpcode,
  TrustingComponentAttrOpcode,
  TrustingDynamicAttrOpcode,
  WellKnownAttrName,
  WireFormat,
} from '@glimmer/interfaces';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { exhausted, LOCAL_LOGGER } from '@glimmer/util';
import { SexpOpcodes } from '@glimmer/wire-format';

import type { OptionalList } from '../../shared/list';
import type * as mir from './mir';

import { deflateAttrName, deflateTagName } from '../../utils';
import { EXPR } from './expressions';

class WireStatements<S extends WireFormat.Statement = WireFormat.Statement> {
  constructor(private statements: readonly S[]) {}

  toArray(): readonly S[] {
    return this.statements;
  }
}

export class ContentEncoder {
  list(statements: mir.Statement[]): WireFormat.Statement[] {
    let out: WireFormat.Statement[] = [];

    for (let statement of statements) {
      let result = CONTENT.content(statement);

      if (result && result instanceof WireStatements) {
        out.push(...result.toArray());
      } else {
        out.push(result);
      }
    }

    return out;
  }

  content(stmt: mir.Statement): WireFormat.Statement | WireStatements {
    if (LOCAL_SHOULD_LOG) {
      LOCAL_LOGGER.log(`encoding`, stmt);
    }

    return this.visitContent(stmt);
  }

  private visitContent(stmt: mir.Statement): WireFormat.Statement | WireStatements {
    switch (stmt.type) {
      case 'Debugger':
        return [SexpOpcodes.Debugger, stmt.scope.getDebugInfo()];
      case 'AppendComment':
        return this.AppendComment(stmt);
      case 'AppendTextNode':
        return this.AppendTextNode(stmt);
      case 'AppendTrustedHTML':
        return this.AppendTrustedHTML(stmt);
      case 'Yield':
        return this.Yield(stmt);
      case 'Component':
        return this.Component(stmt);
      case 'SimpleElement':
        return this.SimpleElement(stmt);
      case 'InElement':
        return this.InElement(stmt);
      case 'InvokeBlock':
        return this.InvokeBlock(stmt);
      case 'If':
        return this.If(stmt);
      case 'Each':
        return this.Each(stmt);
      case 'Let':
        return this.Let(stmt);
      case 'WithDynamicVars':
        return this.WithDynamicVars(stmt);
      case 'InvokeComponent':
        return this.InvokeComponent(stmt);
      default:
        return exhausted(stmt);
    }
  }

  Yield({ to, positional }: mir.Yield): WireFormat.Statements.Yield {
    return [SexpOpcodes.Yield, to, EXPR.Positional(positional)];
  }

  InElement({
    guid,
    insertBefore,
    destination,
    block,
  }: mir.InElement): WireFormat.Statements.InElement {
    let wireBlock = CONTENT.NamedBlock(block)[1];
    // let guid = args.guid;
    let wireDestination = EXPR.expr(destination);
    let wireInsertBefore = EXPR.expr(insertBefore);

    if (wireInsertBefore === undefined) {
      return [SexpOpcodes.InElement, wireBlock, guid, wireDestination];
    } else {
      return [SexpOpcodes.InElement, wireBlock, guid, wireDestination, wireInsertBefore];
    }
  }

  InvokeBlock({ head, args, blocks }: mir.InvokeBlock): WireFormat.Statements.Block {
    return [SexpOpcodes.Block, EXPR.expr(head), ...EXPR.Args(args), CONTENT.NamedBlocks(blocks)];
  }

  AppendTrustedHTML({ html }: mir.AppendTrustedHTML): WireFormat.Statements.TrustingAppend {
    return [SexpOpcodes.TrustingAppend, EXPR.expr(html)];
  }

  AppendTextNode({ text }: mir.AppendTextNode): WireFormat.Statements.Append {
    return [SexpOpcodes.Append, EXPR.expr(text)];
  }

  AppendComment({ value }: mir.AppendComment): WireFormat.Statements.Comment {
    return [SexpOpcodes.Comment, value.chars];
  }

  SimpleElement({ tag, params, body, dynamicFeatures }: mir.SimpleElement): WireStatements {
    let op = dynamicFeatures ? SexpOpcodes.OpenElementWithSplat : SexpOpcodes.OpenElement;
    return new WireStatements<WireFormat.Statement | WireFormat.ElementParameter>([
      [op, deflateTagName(tag.chars)],
      ...CONTENT.ElementParameters(params).toArray(),
      [SexpOpcodes.FlushElement],
      ...CONTENT.list(body),
      [SexpOpcodes.CloseElement],
    ]);
  }

  Component({ tag, params, args, blocks }: mir.Component): WireFormat.Statements.Component {
    let wireTag = EXPR.expr(tag);
    let wirePositional = CONTENT.ElementParameters(params);
    let wireNamed = EXPR.NamedArguments(args);

    let wireNamedBlocks = CONTENT.NamedBlocks(blocks);

    return [
      SexpOpcodes.Component,
      wireTag,
      wirePositional.toPresentArray(),
      wireNamed,
      wireNamedBlocks,
    ];
  }

  ElementParameters({ body }: mir.ElementParameters): OptionalList<WireFormat.ElementParameter> {
    return body.map((p) => CONTENT.ElementParameter(p));
  }

  ElementParameter(param: mir.ElementParameter): WireFormat.ElementParameter {
    switch (param.type) {
      case 'SplatAttr':
        return [SexpOpcodes.AttrSplat, param.symbol];
      case 'DynamicAttr':
        return [dynamicAttrOp(param.kind), ...dynamicAttr(param)];
      case 'StaticAttr':
        return [staticAttrOp(param.kind), ...staticAttr(param)];
      case 'Modifier':
        return [SexpOpcodes.Modifier, EXPR.expr(param.callee), ...EXPR.Args(param.args)];
    }
  }

  NamedBlocks({ blocks }: mir.NamedBlocks): WireFormat.Core.Blocks {
    let names: string[] = [];
    let serializedBlocks: WireFormat.SerializedInlineBlock[] = [];

    for (let block of blocks.toArray()) {
      let [name, serializedBlock] = CONTENT.NamedBlock(block);

      names.push(name);
      serializedBlocks.push(serializedBlock);
    }

    return names.length > 0 ? [names, serializedBlocks] : null;
  }

  NamedBlock({ name, body, scope }: mir.NamedBlock): WireFormat.Core.NamedBlock {
    let nameChars = name.chars;
    if (nameChars === 'inverse') {
      nameChars = 'else';
    }
    return [nameChars, [CONTENT.list(body), scope.slots]];
  }

  If({ condition, block, inverse }: mir.If): WireFormat.Statements.If {
    return [
      SexpOpcodes.If,
      EXPR.expr(condition),
      CONTENT.NamedBlock(block)[1],
      inverse ? CONTENT.NamedBlock(inverse)[1] : null,
    ];
  }

  Each({ value, key, block, inverse }: mir.Each): WireFormat.Statements.Each {
    return [
      SexpOpcodes.Each,
      EXPR.expr(value),
      key ? EXPR.expr(key) : null,
      CONTENT.NamedBlock(block)[1],
      inverse ? CONTENT.NamedBlock(inverse)[1] : null,
    ];
  }

  Let({ positional, block }: mir.Let): WireFormat.Statements.Let {
    return [SexpOpcodes.Let, EXPR.Positional(positional), CONTENT.NamedBlock(block)[1]];
  }

  WithDynamicVars({ named, block }: mir.WithDynamicVars): WireFormat.Statements.WithDynamicVars {
    return [SexpOpcodes.WithDynamicVars, EXPR.NamedArguments(named), CONTENT.NamedBlock(block)[1]];
  }

  InvokeComponent({
    definition,
    args,
    blocks,
  }: mir.InvokeComponent): WireFormat.Statements.InvokeComponent {
    return [
      SexpOpcodes.InvokeComponent,
      EXPR.expr(definition),
      EXPR.Positional(args.positional),
      EXPR.NamedArguments(args.named),
      blocks ? CONTENT.NamedBlocks(blocks) : null,
    ];
  }
}

export const CONTENT = new ContentEncoder();

export type StaticAttrArgs = [name: string | WellKnownAttrName, value: string, namespace?: string];

function staticAttr({ name, value, namespace }: mir.StaticAttr): StaticAttrArgs {
  let out: StaticAttrArgs = [deflateAttrName(name.chars), value.chars];

  if (namespace) {
    out.push(namespace);
  }

  return out;
}

export type DynamicAttrArgs = [
  name: string | WellKnownAttrName,
  value: WireFormat.Expression,
  namespace?: string,
];

function dynamicAttr({ name, value, namespace }: mir.DynamicAttr): DynamicAttrArgs {
  let out: DynamicAttrArgs = [deflateAttrName(name.chars), EXPR.expr(value)];

  if (namespace) {
    out.push(namespace);
  }

  return out;
}

function staticAttrOp(kind: { component: boolean }): StaticAttrOpcode | StaticComponentAttrOpcode;
function staticAttrOp(kind: { component: boolean }): AttrOpcode {
  if (kind.component) {
    return SexpOpcodes.StaticComponentAttr;
  } else {
    return SexpOpcodes.StaticAttr;
  }
}

function dynamicAttrOp(
  kind: mir.AttrKind
):
  | TrustingComponentAttrOpcode
  | TrustingDynamicAttrOpcode
  | ComponentAttrOpcode
  | DynamicAttrOpcode {
  if (kind.component) {
    return kind.trusting ? SexpOpcodes.TrustingComponentAttr : SexpOpcodes.ComponentAttr;
  } else {
    return kind.trusting ? SexpOpcodes.TrustingDynamicAttr : SexpOpcodes.DynamicAttr;
  }
}
