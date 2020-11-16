import { ASTv2, GlimmerSyntaxError, SourceSlice } from '@glimmer/syntax';

import { Err, Result } from '../../../../shared/result';
import * as mir from '../../../2-encoding/mir';
import { VISIT_STMTS } from '../statements';
import { Classified, ClassifiedElement, PreparedArgs } from './classified';

export class ClassifiedSimpleElement implements Classified {
  constructor(
    private tag: SourceSlice,
    private element: ASTv2.SimpleElement,
    readonly dynamicFeatures: boolean
  ) {}

  readonly isComponent = false;

  arg(attr: ASTv2.ComponentArg): Result<mir.NamedArgument> {
    return Err(
      new GlimmerSyntaxError(
        `${attr.name.chars} is not a valid attribute name. @arguments are only allowed on components, but the tag for this element (\`${this.tag.chars}\`) is a regular, non-component HTML element.`,
        attr.loc
      )
    );
  }

  toStatement(classified: ClassifiedElement, { params }: PreparedArgs): Result<mir.Statement> {
    let { state, element } = classified;

    let body = VISIT_STMTS.visitList(this.element.body, state);

    return body.mapOk(
      (body) =>
        new mir.SimpleElement({
          loc: element.loc,
          tag: this.tag,
          params,
          body: body.toArray(),
          dynamicFeatures: this.dynamicFeatures,
        })
    );
  }
}
