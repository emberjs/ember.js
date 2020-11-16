import { ASTv2 } from '@glimmer/syntax';

import { Result } from '../../../../shared/result';
import * as mir from '../../../2-encoding/mir';
import { NormalizationState } from '../../context';
import { VISIT_EXPRS } from '../expressions';
import { VISIT_STMTS } from '../statements';
import { Classified, ClassifiedElement, PreparedArgs } from './classified';

export class ClassifiedComponent implements Classified {
  readonly dynamicFeatures = true;

  constructor(private tag: mir.ExpressionNode, private element: ASTv2.InvokeComponent) {}

  arg(attr: ASTv2.ComponentArg, { state }: ClassifiedElement): Result<mir.NamedArgument> {
    let name = attr.name;

    return VISIT_EXPRS.visit(attr.value, state).mapOk(
      (value) =>
        new mir.NamedArgument({
          loc: attr.loc,
          key: name,
          value,
        })
    );
  }

  toStatement(component: ClassifiedElement, { args, params }: PreparedArgs): Result<mir.Statement> {
    let { element, state } = component;

    return this.blocks(state).mapOk(
      (blocks) =>
        new mir.Component({
          loc: element.loc,
          tag: this.tag,
          params,
          args,
          blocks,
        })
    );
  }

  private blocks(state: NormalizationState): Result<mir.NamedBlocks> {
    return VISIT_STMTS.NamedBlocks(this.element.blocks, state);
  }
}
