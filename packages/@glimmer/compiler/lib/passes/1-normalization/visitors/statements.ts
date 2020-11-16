import { ASTv2 } from '@glimmer/syntax';

import { OptionalList } from '../../../shared/list';
import { Ok, Result, ResultArray } from '../../../shared/result';
import * as mir from '../../2-encoding/mir';
import { NormalizationState } from '../context';
import { BLOCK_KEYWORDS } from '../keywords';
import { APPEND_KEYWORDS } from '../keywords/append';
import { ClassifiedElement, hasDynamicFeatures } from './element/classified';
import { ClassifiedComponent } from './element/component';
import { ClassifiedSimpleElement } from './element/simple-element';
import { VISIT_EXPRS } from './expressions';

class NormalizationStatements {
  visitList(
    nodes: readonly ASTv2.ContentNode[],
    state: NormalizationState
  ): Result<OptionalList<mir.Statement>> {
    return new ResultArray(nodes.map((e) => VISIT_STMTS.visit(e, state)))
      .toOptionalList()
      .mapOk((list) => list.filter((s: mir.Statement | null): s is mir.Statement => s !== null));
  }

  visit(node: ASTv2.ContentNode, state: NormalizationState): Result<mir.Statement | null> {
    switch (node.type) {
      case 'GlimmerComment':
        return Ok(null);
      case 'AppendContent':
        return this.AppendContent(node, state);
      case 'HtmlText':
        return Ok(this.TextNode(node));
      case 'HtmlComment':
        return Ok(this.HtmlComment(node));
      case 'InvokeBlock':
        return this.InvokeBlock(node, state);
      case 'InvokeComponent':
        return this.Component(node, state);
      case 'SimpleElement':
        return this.SimpleElement(node, state);
    }
  }

  InvokeBlock(node: ASTv2.InvokeBlock, state: NormalizationState): Result<mir.Statement> {
    let translated = BLOCK_KEYWORDS.translate(node, state);

    if (translated !== null) {
      return translated;
    }

    let head = VISIT_EXPRS.visit(node.callee, state);
    let args = VISIT_EXPRS.Args(node.args, state);

    return Result.all(head, args).andThen(([head, args]) =>
      this.NamedBlocks(node.blocks, state).mapOk(
        (blocks) =>
          new mir.InvokeBlock({
            loc: node.loc,
            head,
            args,
            blocks,
          })
      )
    );
  }

  NamedBlocks(blocks: ASTv2.NamedBlocks, state: NormalizationState): Result<mir.NamedBlocks> {
    let list = new ResultArray(blocks.blocks.map((b) => this.NamedBlock(b, state)));

    return list
      .toArray()
      .mapOk((list) => new mir.NamedBlocks({ loc: blocks.loc, blocks: OptionalList(list) }));
  }

  NamedBlock(named: ASTv2.NamedBlock, state: NormalizationState): Result<mir.NamedBlock> {
    let body = state.visitBlock(named.block);

    return body.mapOk((body) => {
      return new mir.NamedBlock({
        loc: named.loc,
        name: named.name,
        body: body.toArray(),
        scope: named.block.scope,
      });
    });
  }

  SimpleElement(element: ASTv2.SimpleElement, state: NormalizationState): Result<mir.Statement> {
    return new ClassifiedElement(
      element,
      new ClassifiedSimpleElement(element.tag, element, hasDynamicFeatures(element)),
      state
    ).toStatement();
  }

  Component(component: ASTv2.InvokeComponent, state: NormalizationState): Result<mir.Statement> {
    return VISIT_EXPRS.visit(component.callee, state).andThen((callee) =>
      new ClassifiedElement(
        component,
        new ClassifiedComponent(callee, component),
        state
      ).toStatement()
    );
  }

  AppendContent(append: ASTv2.AppendContent, state: NormalizationState): Result<mir.Statement> {
    let translated = APPEND_KEYWORDS.translate(append, state);

    if (translated !== null) {
      return translated;
    }

    let value = VISIT_EXPRS.visit(append.value, state);

    return value.mapOk((value) => {
      if (append.trusting) {
        return new mir.AppendTrustedHTML({
          loc: append.loc,
          html: value,
        });
      } else {
        return new mir.AppendTextNode({
          loc: append.loc,
          text: value,
        });
      }
    });
  }

  TextNode(text: ASTv2.HtmlText): mir.Statement {
    return new mir.AppendTextNode({
      loc: text.loc,
      text: new ASTv2.LiteralExpression({ loc: text.loc, value: text.chars }),
    });
  }

  HtmlComment(comment: ASTv2.HtmlComment): mir.Statement {
    return new mir.AppendComment({
      loc: comment.loc,
      value: comment.text,
    });
  }
}

export const VISIT_STMTS = new NormalizationStatements();
