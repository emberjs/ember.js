import { PresentArray } from '@glimmer/interfaces';

import { SourceSlice } from '../../source/slice';
import * as ASTv2 from '../api';
import type {
  SerializedAppendContent,
  SerializedArgReference,
  SerializedArgs,
  SerializedAttrOrArg,
  SerializedBlock,
  SerializedCallExpression,
  SerializedContentNode,
  SerializedElementModifier,
  SerializedExpressionNode,
  SerializedFreeVarReference,
  SerializedGlimmerComment,
  SerializedHtmlComment,
  SerializedHtmlOrSplatAttr,
  SerializedHtmlText,
  SerializedInterpolateExpression,
  SerializedInvokeBlock,
  SerializedInvokeComponent,
  SerializedLiteralExpression,
  SerializedLocalVarReference,
  SerializedNamed,
  SerializedNamedArgument,
  SerializedNamedBlock,
  SerializedNamedBlocks,
  SerializedPathExpression,
  SerializedPositional,
  SerializedSimpleElement,
  SerializedThisReference,
  SerializedVariableReference,
} from './types';

export class RefSerializer {
  arg(ref: ASTv2.ArgReference): SerializedArgReference {
    return {
      type: 'Arg',
      loc: ref.loc.serialize(),
      name: ref.name.serialize(),
    };
  }

  free(ref: ASTv2.FreeVarReference): SerializedFreeVarReference {
    return {
      type: 'Free',
      loc: ref.loc.serialize(),
      resolution: ref.resolution.serialize(),
      name: ref.name,
    };
  }

  local(ref: ASTv2.LocalVarReference): SerializedLocalVarReference {
    return {
      type: 'Local',
      loc: ref.loc.serialize(),
      name: ref.name,
    };
  }

  self(ref: ASTv2.ThisReference): SerializedThisReference {
    return {
      type: 'This',
      loc: ref.loc.serialize(),
    };
  }
}

const REF = new RefSerializer();

export class ExprSerializer {
  literal(literal: ASTv2.LiteralExpression): SerializedLiteralExpression {
    return {
      type: 'Literal',
      loc: literal.loc.serialize(),
      value: literal.value,
    };
  }

  path(path: ASTv2.PathExpression): SerializedPathExpression {
    return {
      type: 'Path',
      loc: path.loc.serialize(),
      ref: visit.ref(path.ref),
      tail: path.tail.map((t) => t.serialize()),
    };
  }

  call(call: ASTv2.CallExpression): SerializedCallExpression {
    return {
      type: 'Call',
      loc: call.loc.serialize(),
      callee: visit.expr(call.callee),
      args: ARGS.args(call.args),
    };
  }

  interpolate(interpolate: ASTv2.InterpolateExpression): SerializedInterpolateExpression {
    return {
      type: 'Interpolate',
      loc: interpolate.loc.serialize(),
      parts: interpolate.parts.map((p) => visit.expr(p)) as PresentArray<SerializedExpressionNode>,
    };
  }
}

const EXPR = new ExprSerializer();

class ArgsSerializer {
  args(args: ASTv2.Args): SerializedArgs {
    return {
      loc: args.loc.serialize(),
      positional: this.positional(args.positional),
      named: this.named(args.named),
    };
  }

  positional(positional: ASTv2.PositionalArguments): SerializedPositional {
    return {
      loc: positional.loc.serialize(),
      exprs: positional.exprs.map((p) => visit.expr(p)),
    };
  }

  named(named: ASTv2.NamedArguments): SerializedNamed {
    return {
      loc: named.loc.serialize(),
      entries: named.entries.map((e) => this.entry(e)),
    };
  }

  entry(entry: ASTv2.NamedArgument): SerializedNamedArgument {
    return [entry.name.serialize(), visit.expr(entry.value)];
  }
}

const ARGS = new ArgsSerializer();

export class ContentSerializer {
  append(node: ASTv2.AppendContent): SerializedAppendContent {
    return {
      type: 'Append',
      loc: node.loc.serialize(),
      value: visit.expr(node.value),
      trusting: node.trusting,
    };
  }

  glimmerComment(node: ASTv2.GlimmerComment): SerializedGlimmerComment {
    return {
      type: 'GlimmerComment',
      loc: node.loc.serialize(),
      text: node.text.serialize(),
    };
  }

  htmlComment(node: ASTv2.HtmlComment): SerializedHtmlComment {
    return {
      type: 'HtmlComment',
      loc: node.loc.serialize(),
      text: node.text.serialize(),
    };
  }

  htmlText(node: ASTv2.HtmlText): SerializedHtmlText {
    return {
      type: 'HtmlText',
      loc: node.loc.serialize(),
      chars: node.chars,
    };
  }

  invokeBlock(node: ASTv2.InvokeBlock): SerializedInvokeBlock {
    let args = ARGS.args(node.args);
    let callee = visit.expr(node.callee);

    return {
      type: 'InvokeBlock',
      loc: node.loc.serialize(),
      args,
      callee,
      blocks: INTERNAL.namedBlocks(node.blocks),
    };
  }

  invokeComponent(node: ASTv2.InvokeComponent): SerializedInvokeComponent {
    return {
      type: 'InvokeComponent',
      loc: node.loc.serialize(),
      callee: visit.expr(node.callee),
      blocks: INTERNAL.namedBlocks(node.blocks),
      attrs: node.attrs.map((a) => visit.attr(a)),
      componentArgs: node.componentArgs.map((a) => ATTRS.arg(a)),
      modifiers: node.modifiers.map((m) => ATTRS.modifier(m)),
    };
  }

  simpleElement(node: ASTv2.SimpleElement): SerializedSimpleElement {
    return {
      type: 'SimpleElement',
      loc: node.loc.serialize(),
      tag: node.tag.serialize(),
      body: node.body.map((b) => visit.content(b)),
      attrs: node.attrs.map((a) => visit.attr(a)),
      componentArgs: node.componentArgs.map((a) => ATTRS.arg(a)),
      modifiers: node.modifiers.map((m) => ATTRS.modifier(m)),
    };
  }
}

const CONTENT = new ContentSerializer();

class AttrBlockSerializer {
  modifier(node: ASTv2.ElementModifier): SerializedElementModifier {
    return {
      loc: node.loc.serialize(),
      callee: visit.expr(node.callee),
      args: ARGS.args(node.args),
    };
  }

  arg(node: ASTv2.ComponentArg): SerializedAttrOrArg {
    return this.anyAttr(node);
  }

  anyAttr(node: ASTv2.ComponentArg | ASTv2.HtmlAttr): SerializedAttrOrArg {
    return {
      loc: node.loc.serialize(),
      name: node.name.serialize(),
      value: visit.expr(node.value),
      trusting: node.trusting,
    };
  }
}

const ATTRS = new AttrBlockSerializer();

class InternalSerializer {
  block(node: ASTv2.Block): SerializedBlock {
    return {
      loc: node.loc.serialize(),
      body: node.body.map((b) => visit.content(b)),
      table: node.scope.locals,
    };
  }

  namedBlock(node: ASTv2.NamedBlock): SerializedNamedBlock {
    return {
      name: node.name.serialize(),
      block: INTERNAL.block(node.block),
    };
  }

  namedBlocks(node: ASTv2.NamedBlocks): SerializedNamedBlocks {
    return {
      blocks: node.blocks.map((b) => INTERNAL.namedBlock(b)),
      loc: node.loc.serialize(),
    };
  }
}

const INTERNAL = new InternalSerializer();

const visit = {
  expr(expr: ASTv2.ExpressionNode): SerializedExpressionNode {
    switch (expr.type) {
      case 'Literal':
        return EXPR.literal(expr);
      case 'Path':
        return EXPR.path(expr);
      case 'Call':
        return EXPR.call(expr);
      case 'Interpolate':
        return EXPR.interpolate(expr);
    }
  },

  attr(node: ASTv2.HtmlOrSplatAttr): SerializedHtmlOrSplatAttr {
    if (node.type === 'SplatAttr') {
      return new SourceSlice({ loc: node.loc, chars: '...attributes' }).serialize();
    } else {
      return ATTRS.anyAttr(node);
    }
  },

  ref(ref: ASTv2.VariableReference): SerializedVariableReference {
    switch (ref.type) {
      case 'Arg':
        return REF.arg(ref);
      case 'Free':
        return REF.free(ref);
      case 'Local':
        return REF.local(ref);
      case 'This':
        return REF.self(ref);
    }
  },

  content(node: ASTv2.ContentNode): SerializedContentNode {
    switch (node.type) {
      case 'AppendContent':
        return CONTENT.append(node);
      case 'GlimmerComment':
        return CONTENT.glimmerComment(node);
      case 'HtmlComment':
        return CONTENT.htmlComment(node);
      case 'HtmlText':
        return CONTENT.htmlText(node);
      case 'InvokeBlock':
        return CONTENT.invokeBlock(node);
      case 'InvokeComponent':
        return CONTENT.invokeComponent(node);
      case 'SimpleElement':
        return CONTENT.simpleElement(node);
    }
  },
};
